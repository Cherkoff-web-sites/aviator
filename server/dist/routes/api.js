import { Router } from 'express';
import { addDays, format, startOfDay } from 'date-fns';
import { readStore, updateStore, newId } from '../lib/store.js';
import { addMinutesToTime, buildCalendarDays, calendarRangeForRole, filterBookingsForRole, generateCode, getDayStatus, toDateKey, } from '../lib/helpers.js';
import { emitAdmin } from '../lib/socket.js';
function sessionMiddleware(req, res, next) {
    const role = req.headers['x-role'];
    const userId = req.headers['x-user-id'];
    if (!role || !userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const store = readStore();
    const user = store.users.find((u) => u.id === userId && u.role === role);
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    req.session = { role, userId };
    next();
}
function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.session || !roles.includes(req.session.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    };
}
function hideFromPilots(req, res, next) {
    if (req.session?.role === 'PILOT') {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    next();
}
function broadcast() {
    emitAdmin('store:updated', { at: new Date().toISOString() });
}
export const apiRouter = Router();
// --- Public ---
apiRouter.get('/health', (_req, res) => res.json({ ok: true }));
apiRouter.get('/public/calendar', (_req, res) => {
    const store = readStore();
    const from = startOfDay(new Date());
    const months = store.settings.bookingWindowMonths ?? 3;
    const to = addMonthsSafe(from, months);
    res.json({ days: buildCalendarDays(store, from, to) });
});
apiRouter.get('/public/settings', (_req, res) => {
    const store = readStore();
    res.json({ bookingWindowMonths: store.settings.bookingWindowMonths ?? 3 });
});
apiRouter.get('/public/certificates/validate', (req, res) => {
    const number = String(req.query.number ?? '').trim();
    if (!number)
        return res.status(400).json({ valid: false });
    const store = readStore();
    const cert = store.certificates.find((c) => c.number === number);
    if (!cert || cert.status !== 'ACTIVE')
        return res.json({ valid: false });
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    if (cert.validFrom > today || cert.validTo < today) {
        return res.json({ valid: false, reason: 'EXPIRED' });
    }
    res.json({
        valid: true,
        simulatorSlug: cert.simulatorSlug,
        durationMin: cert.durationMin,
        number: cert.number,
    });
});
apiRouter.get('/public/prices/flights', (_req, res) => {
    res.json(readStore().flightPrices);
});
apiRouter.get('/public/prices/certificates', (_req, res) => {
    res.json(readStore().certPrices);
});
apiRouter.get('/public/promos', (_req, res) => {
    res.json(readStore().promos.filter((p) => p.active));
});
apiRouter.get('/public/contacts', (_req, res) => {
    res.json(readStore().contacts);
});
apiRouter.post('/public/bookings', async (req, res) => {
    const body = req.body;
    const holdExpiresAt = new Date(Date.now() + 2 * 60_000).toISOString();
    const code = generateCode(6);
    const endTime = addMinutesToTime(body.startTime, body.durationMin);
    const promoNote = body.isBirthdayPromo
        ? 'ДР-15%'
        : body.certificateNumber
            ? `EB-${String(body.simulatorSlug).toUpperCase()}-${body.certificateNumber}`
            : undefined;
    const booking = {
        id: newId(),
        date: body.date,
        startTime: body.startTime,
        endTime,
        durationMin: body.durationMin,
        simulatorSlug: body.simulatorSlug,
        name: body.name,
        phone: body.phone,
        email: body.email,
        status: 'PENDING_CONFIRMATION',
        paid: false,
        paymentMethod: body.paymentMethod ?? 'OFFLINE',
        comment: body.comment ?? '',
        isBirthdayPromo: !!body.isBirthdayPromo,
        birthdayDate: body.birthdayDate,
        certificateNumber: body.certificateNumber,
        promoNote,
        holdExpiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await updateStore((s) => {
        s.bookings.push(booking);
        s.pendingCodes.push({
            bookingId: booking.id,
            code,
            expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
            sentAt: new Date().toISOString(),
        });
    });
    console.log(`[BOOKING CODE] ${body.email}: ${code}`);
    broadcast();
    res.status(201).json({ bookingId: booking.id, holdExpiresAt });
});
apiRouter.post('/public/bookings/:id/confirm', async (req, res) => {
    const id = String(req.params.id);
    const code = String(req.body.code ?? '');
    const store = readStore();
    const booking = store.bookings.find((b) => b.id === id);
    if (!booking)
        return res.status(404).json({ error: 'NOT_FOUND' });
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date().toISOString()) {
        await updateStore((s) => {
            const b = s.bookings.find((x) => x.id === id);
            if (b)
                b.status = 'EXPIRED';
        });
        return res.status(410).json({ error: 'HOLD_EXPIRED' });
    }
    const match = store.pendingCodes.find((c) => c.bookingId === id && c.code === code && c.expiresAt > new Date().toISOString());
    if (!match)
        return res.status(400).json({ error: 'INVALID_CODE' });
    await updateStore((s) => {
        const b = s.bookings.find((x) => x.id === id);
        if (b) {
            b.status = 'CONFIRMED';
            b.holdExpiresAt = undefined;
            b.updatedAt = new Date().toISOString();
        }
        s.pendingCodes = s.pendingCodes.filter((c) => c.bookingId !== id);
    });
    broadcast();
    res.json(readStore().bookings.find((b) => b.id === id));
});
apiRouter.post('/public/bookings/:id/resend-code', async (req, res) => {
    const id = String(req.params.id);
    const store = readStore();
    const last = [...store.pendingCodes].reverse().find((c) => c.bookingId === id);
    if (last && Date.now() - new Date(last.sentAt).getTime() < 60_000) {
        return res.status(429).json({ error: 'RESEND_TOO_SOON' });
    }
    const booking = store.bookings.find((b) => b.id === id);
    if (!booking)
        return res.status(404).json({ error: 'NOT_FOUND' });
    const code = generateCode(6);
    await updateStore((s) => {
        s.pendingCodes.push({
            bookingId: id,
            code,
            expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
            sentAt: new Date().toISOString(),
        });
    });
    console.log(`[BOOKING CODE] ${booking.email}: ${code}`);
    res.json({ ok: true });
});
apiRouter.post('/public/certificates', async (req, res) => {
    const body = req.body;
    const store = readStore();
    const number = `№${store.counters.certificate}`;
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const validTo = format(addDays(new Date(), 90), 'yyyy-MM-dd');
    const cert = {
        id: newId(),
        number,
        phone: body.phone,
        fullName: `${body.firstName} ${body.lastName}`.trim(),
        durationMin: body.durationMin,
        paymentStatus: 'PAID',
        validFrom: today,
        validTo,
        simulatorSlug: body.simulatorSlug,
        status: 'ACTIVE',
        comment: body.comment ?? '',
        createdAt: new Date().toISOString(),
    };
    await updateStore((s) => {
        s.certificates.unshift(cert);
        s.counters.certificate += 1;
    });
    broadcast();
    console.log(`[CERTIFICATE] ${cert.number} for ${cert.fullName}`);
    res.status(201).json(cert);
});
// --- Session info ---
apiRouter.get('/auth/me', sessionMiddleware, (req, res) => {
    const user = readStore().users.find((u) => u.id === req.session.userId);
    res.json(user);
});
// --- Admin (authenticated) ---
apiRouter.use('/admin', sessionMiddleware);
apiRouter.get('/admin/bookings', (req, res) => {
    const date = req.query.date ? String(req.query.date) : toDateKey(new Date());
    const store = readStore();
    res.json(filterBookingsForRole(store, req.session.role, req.session.userId, date));
});
apiRouter.post('/admin/bookings', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const body = req.body;
    const booking = {
        id: newId(),
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime ?? addMinutesToTime(body.startTime, body.durationMin),
        durationMin: body.durationMin,
        simulatorSlug: body.simulatorSlug,
        name: body.name,
        phone: body.phone,
        email: body.email ?? '',
        status: body.status ?? 'CONFIRMED',
        paid: !!body.paid,
        paymentMethod: body.paymentMethod ?? 'OFFLINE',
        comment: body.comment ?? '',
        isBirthdayPromo: !!body.isBirthdayPromo,
        promoNote: body.promoNote,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await updateStore((s) => s.bookings.push(booking));
    broadcast();
    res.status(201).json(booking);
});
apiRouter.patch('/admin/bookings/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const id = String(req.params.id);
    let updated;
    await updateStore((s) => {
        const b = s.bookings.find((x) => x.id === id);
        if (b)
            Object.assign(b, req.body, { updatedAt: new Date().toISOString() });
        updated = b;
    });
    broadcast();
    res.json(updated);
});
apiRouter.delete('/admin/bookings/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const id = String(req.params.id);
    await updateStore((s) => {
        s.bookings = s.bookings.filter((b) => b.id !== id);
    });
    broadcast();
    res.json({ ok: true });
});
apiRouter.get('/admin/calendar', (req, res) => {
    const { from, to } = calendarRangeForRole(req.session.role);
    const store = readStore();
    res.json({
        days: buildCalendarDays(store, from, to),
        range: { from: toDateKey(from), to: toDateKey(to) },
    });
});
apiRouter.put('/admin/calendar/:date', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const date = String(req.params.date);
    const status = req.body.status;
    await updateStore((s) => {
        s.calendar[date] = status;
    });
    broadcast();
    res.json({ date, status });
});
apiRouter.post('/admin/calendar/toggle-holidays', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const { dates } = req.body;
    await updateStore((s) => {
        for (const d of dates) {
            const cur = getDayStatus(s, d);
            s.calendar[d] = cur === 'HOLIDAY' ? 'OPEN' : 'HOLIDAY';
        }
    });
    broadcast();
    res.json({ ok: true });
});
apiRouter.post('/admin/calendar/toggle-blocked', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const { dates } = req.body;
    await updateStore((s) => {
        for (const d of dates) {
            const cur = getDayStatus(s, d);
            s.calendar[d] = cur === 'BLOCKED' ? 'OPEN' : 'BLOCKED';
        }
    });
    broadcast();
    res.json({ ok: true });
});
apiRouter.get('/admin/staff-shifts', (req, res) => {
    const month = String(req.query.month ?? '');
    const store = readStore();
    const rows = store.staffShifts.filter((sh) => sh.date.startsWith(month));
    res.json(rows.map((sh) => ({
        ...sh,
        user: store.users.find((u) => u.id === sh.userId),
    })));
});
apiRouter.post('/admin/staff-shifts', async (req, res) => {
    const isPilot = req.session.role === 'PILOT';
    const shift = {
        id: newId(),
        date: req.body.date,
        userId: isPilot ? req.session.userId : req.body.userId,
        simulatorSlug: req.body.simulatorSlug,
        createdAt: new Date().toISOString(),
    };
    await updateStore((s) => s.staffShifts.push(shift));
    broadcast();
    const store = readStore();
    res.status(201).json({ ...shift, user: store.users.find((u) => u.id === shift.userId) });
});
apiRouter.delete('/admin/staff-shifts/:id', async (req, res) => {
    const id = String(req.params.id);
    const store = readStore();
    const shift = store.staffShifts.find((s) => s.id === id);
    if (!shift)
        return res.status(404).json({ error: 'NOT_FOUND' });
    if (req.session.role === 'PILOT' && shift.userId !== req.session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    await updateStore((s) => {
        s.staffShifts = s.staffShifts.filter((x) => x.id !== id);
    });
    broadcast();
    res.json({ ok: true });
});
apiRouter.use('/admin', hideFromPilots);
apiRouter.get('/admin/certificates', (_req, res) => {
    res.json(readStore().certificates);
});
apiRouter.post('/admin/certificates', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const body = req.body;
    const cert = {
        id: newId(),
        number: body.number ?? `№${readStore().counters.certificate}`,
        phone: body.phone,
        fullName: body.fullName,
        durationMin: body.durationMin,
        paymentStatus: body.paymentStatus ?? 'UNPAID',
        validFrom: body.validFrom,
        validTo: body.validTo,
        simulatorSlug: body.simulatorSlug,
        status: body.status ?? 'ACTIVE',
        comment: body.comment ?? '',
        createdAt: new Date().toISOString(),
    };
    await updateStore((s) => {
        s.certificates.unshift(cert);
        if (!body.number)
            s.counters.certificate += 1;
    });
    broadcast();
    res.status(201).json(cert);
});
apiRouter.patch('/admin/certificates/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const id = String(req.params.id);
    let updated;
    await updateStore((s) => {
        const c = s.certificates.find((x) => x.id === id);
        if (c)
            Object.assign(c, req.body);
        updated = c;
    });
    broadcast();
    res.json(updated);
});
apiRouter.delete('/admin/certificates/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const id = String(req.params.id);
    await updateStore((s) => {
        s.certificates = s.certificates.filter((c) => c.id !== id);
    });
    broadcast();
    res.json({ ok: true });
});
apiRouter.get('/admin/waiting-room', (req, res) => {
    const date = req.query.date ? String(req.query.date) : undefined;
    let rows = readStore().waitingRoom;
    if (date)
        rows = rows.filter((r) => r.date === date);
    res.json(rows);
});
apiRouter.post('/admin/waiting-room', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const entry = {
        id: newId(),
        date: req.body.date,
        line: req.body.line,
        createdAt: new Date().toISOString(),
    };
    await updateStore((s) => s.waitingRoom.unshift(entry));
    broadcast();
    res.status(201).json(entry);
});
apiRouter.delete('/admin/waiting-room/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const id = String(req.params.id);
    await updateStore((s) => {
        s.waitingRoom = s.waitingRoom.filter((w) => w.id !== id);
    });
    broadcast();
    res.json({ ok: true });
});
apiRouter.get('/admin/prices/flights', (_req, res) => res.json(readStore().flightPrices));
apiRouter.get('/admin/prices/certificates', (_req, res) => res.json(readStore().certPrices));
apiRouter.get('/admin/promos', (_req, res) => res.json(readStore().promos));
apiRouter.put('/admin/prices/flights', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    await updateStore((s) => {
        s.flightPrices = req.body.rows;
    });
    broadcast();
    res.json(readStore().flightPrices);
});
apiRouter.put('/admin/prices/certificates', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    await updateStore((s) => {
        s.certPrices = req.body.rows;
    });
    broadcast();
    res.json(readStore().certPrices);
});
apiRouter.put('/admin/promos', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    await updateStore((s) => {
        s.promos = req.body.rows;
    });
    broadcast();
    res.json(readStore().promos);
});
apiRouter.get('/admin/work-hours', (_req, res) => res.json(readStore().workHours));
apiRouter.post('/admin/work-hours', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const entry = { id: newId(), line: req.body.line, createdAt: new Date().toISOString() };
    await updateStore((s) => s.workHours.unshift(entry));
    broadcast();
    res.status(201).json(entry);
});
apiRouter.delete('/admin/work-hours/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const id = String(req.params.id);
    await updateStore((s) => {
        s.workHours = s.workHours.filter((w) => w.id !== id);
    });
    broadcast();
    res.json({ ok: true });
});
apiRouter.get('/admin/pilots', requireRoles('ADMIN', 'MANAGER'), (_req, res) => {
    res.json(readStore().users.filter((u) => u.role === 'PILOT' && u.isActive));
});
apiRouter.get('/admin/accounts', requireRoles('ADMIN'), (_req, res) => {
    res.json(readStore().users);
});
apiRouter.post('/admin/accounts', requireRoles('ADMIN'), async (req, res) => {
    const body = req.body;
    const user = {
        id: newId(),
        login: body.login,
        fullName: body.fullName,
        phone: body.phone ?? '',
        role: body.role,
        isActive: body.isActive ?? true,
        color: body.color ?? '#2563eb',
        pilotSimulators: body.pilotSimulators ?? [],
    };
    await updateStore((s) => s.users.push(user));
    broadcast();
    res.status(201).json(user);
});
apiRouter.patch('/admin/accounts/:id', requireRoles('ADMIN'), async (req, res) => {
    const id = String(req.params.id);
    let updated;
    await updateStore((s) => {
        const u = s.users.find((x) => x.id === id);
        if (u)
            Object.assign(u, req.body);
        updated = u;
    });
    broadcast();
    res.json(updated);
});
apiRouter.get('/admin/settings/option-lists', requireRoles('ADMIN'), (_req, res) => {
    res.json(readStore().optionLists);
});
apiRouter.put('/admin/settings/option-lists/:key', requireRoles('ADMIN'), async (req, res) => {
    const key = String(req.params.key);
    const rows = req.body.rows;
    await updateStore((s) => {
        if (key in s.optionLists) {
            ;
            s.optionLists[key] = rows;
        }
    });
    broadcast();
    res.json(readStore().optionLists);
});
apiRouter.get('/admin/settings/documents', requireRoles('ADMIN'), (_req, res) => {
    res.json(readStore().documents);
});
apiRouter.patch('/admin/settings/documents/:key', requireRoles('ADMIN'), async (req, res) => {
    const key = String(req.params.key);
    let doc;
    await updateStore((s) => {
        doc = s.documents.find((d) => d.key === key);
        if (doc)
            doc.content = req.body.content;
    });
    broadcast();
    res.json(doc);
});
apiRouter.get('/admin/settings/contacts', requireRoles('ADMIN'), (_req, res) => {
    res.json(readStore().contacts);
});
apiRouter.put('/admin/settings/contacts', requireRoles('ADMIN'), async (req, res) => {
    await updateStore((s) => {
        s.contacts = req.body;
    });
    broadcast();
    res.json(readStore().contacts);
});
apiRouter.get('/admin/settings/gallery/:slug', requireRoles('ADMIN'), (req, res) => {
    const slug = String(req.params.slug);
    res.json(readStore().gallery[slug] ?? []);
});
apiRouter.post('/admin/settings/gallery/:slug', requireRoles('ADMIN'), async (req, res) => {
    const slug = String(req.params.slug);
    const url = String(req.body.url);
    await updateStore((s) => {
        if (!s.gallery[slug])
            s.gallery[slug] = [];
        s.gallery[slug].push(url);
    });
    broadcast();
    res.json(readStore().gallery[slug]);
});
apiRouter.get('/admin/analytics/overview', (_req, res) => {
    const store = readStore();
    const confirmed = store.bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'DONE');
    res.json({
        total: confirmed.length,
        b737: confirmed.filter((b) => b.simulatorSlug === 'boeing-737').length,
        mi2: confirmed.filter((b) => b.simulatorSlug === 'mi-2').length,
        certificates: store.certificates.length,
    });
});
apiRouter.get('/admin/analytics/series', (req, res) => {
    const store = readStore();
    const slug = req.query.simulator ? String(req.query.simulator) : undefined;
    const byDate = new Map();
    for (const b of store.bookings) {
        if (slug && b.simulatorSlug !== slug)
            continue;
        if (b.status === 'CANCELLED' || b.status === 'EXPIRED')
            continue;
        byDate.set(b.date, (byDate.get(b.date) ?? 0) + 1);
    }
    const series = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ label: date.slice(5), value }));
    res.json(series.length ? series : [{ label: format(new Date(), 'MM-dd'), value: 0 }]);
});
apiRouter.post('/admin/maintenance', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const entry = {
        id: newId(),
        plannedAt: req.body.plannedAt ?? new Date().toISOString(),
        notes: req.body.notes ?? '',
        createdAt: new Date().toISOString(),
    };
    await updateStore((s) => s.maintenance.unshift(entry));
    broadcast();
    res.status(201).json(entry);
});
function subMonthsSafe(d, n) {
    return new Date(d.getFullYear(), d.getMonth() - n, d.getDate());
}
function addMonthsSafe(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}
// Expire stale bookings periodically
setInterval(() => {
    void updateStore((s) => {
        const now = new Date().toISOString();
        for (const b of s.bookings) {
            if (b.status === 'PENDING_CONFIRMATION' && b.holdExpiresAt && b.holdExpiresAt < now) {
                b.status = 'EXPIRED';
            }
        }
    });
}, 30_000);
