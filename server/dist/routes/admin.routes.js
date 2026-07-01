import { Router } from 'express';
import { z } from 'zod';
import { CalendarDayStatus, UserRole } from '@prisma/client';
import { calendarRangeForRole, createUser, getCalendarDays, loginStep1, loginStep2, sanitizeUser, setCalendarDayStatus, bookingWhereForRole, } from '../services/auth.service.js';
import { requireAuth, requireRoles, hideFromPilots } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth-utils.js';
import { emitAdmin } from '../lib/socket.js';
import { toDateKey } from '../lib/dates.js';
import { startOfDay } from 'date-fns';
function paramId(value) {
    return Array.isArray(value) ? value[0] : value;
}
export const authRouter = Router();
authRouter.post('/login', async (req, res) => {
    try {
        const { login, password, fingerprint } = z
            .object({ login: z.string(), password: z.string(), fingerprint: z.string() })
            .parse(req.body);
        const result = await loginStep1(login, password, fingerprint);
        res.json(result);
    }
    catch {
        res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
});
authRouter.post('/verify-code', async (req, res) => {
    try {
        const { userId, code, fingerprint } = z
            .object({ userId: z.string(), code: z.string(), fingerprint: z.string() })
            .parse(req.body);
        const result = await loginStep2(userId, code, fingerprint);
        res.json(result);
    }
    catch {
        res.status(400).json({ error: 'INVALID_CODE' });
    }
});
authRouter.get('/me', requireAuth, async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
    res.json(sanitizeUser(user));
});
export const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.get('/bookings', async (req, res) => {
    const date = req.query.date ? String(req.query.date) : toDateKey(new Date());
    const where = {
        date: startOfDay(new Date(date)),
        ...bookingWhereForRole(req.user.role, req.user.pilotSimulators),
    };
    const rows = await prisma.booking.findMany({ where, orderBy: { startTime: 'asc' } });
    res.json(rows);
});
adminRouter.post('/bookings', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const body = req.body;
    const row = await prisma.booking.create({ data: body });
    emitAdmin('booking:created', { id: row.id, date: toDateKey(row.date) });
    res.status(201).json(row);
});
adminRouter.patch('/bookings/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const row = await prisma.booking.update({ where: { id: paramId(req.params.id) }, data: req.body });
    emitAdmin('booking:updated', { id: row.id, date: toDateKey(row.date) });
    res.json(row);
});
adminRouter.delete('/bookings/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const row = await prisma.booking.delete({ where: { id: paramId(req.params.id) } });
    emitAdmin('booking:deleted', { id: row.id, date: toDateKey(row.date) });
    res.json({ ok: true });
});
adminRouter.get('/calendar', async (req, res) => {
    const { from, to } = calendarRangeForRole(req.user.role);
    const days = await getCalendarDays(from, to);
    res.json({ days, range: { from: toDateKey(from), to: toDateKey(to) } });
});
adminRouter.put('/calendar/:date', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const status = z.nativeEnum(CalendarDayStatus).parse(req.body.status);
    const row = await setCalendarDayStatus(paramId(req.params.date), status, req.user.id);
    emitAdmin('calendar:updated', { date: toDateKey(row.date), status: row.status });
    res.json(row);
});
adminRouter.get('/staff-shifts', async (req, res) => {
    const month = String(req.query.month ?? '');
    const [y, m] = month.split('-').map(Number);
    const from = startOfDay(new Date(y, m - 1, 1));
    const to = startOfDay(new Date(y, m, 0));
    const rows = await prisma.staffShift.findMany({
        where: { date: { gte: from, lte: to } },
        include: { user: true },
    });
    res.json(rows);
});
adminRouter.post('/staff-shifts', async (req, res) => {
    const isPilot = req.user.role === 'PILOT';
    const data = req.body;
    if (isPilot) {
        data.userId = req.user.id;
    }
    const row = await prisma.staffShift.create({
        data,
        include: { user: true },
    });
    emitAdmin('shift:created', { id: row.id });
    res.status(201).json(row);
});
adminRouter.delete('/staff-shifts/:id', async (req, res) => {
    const shift = await prisma.staffShift.findUniqueOrThrow({ where: { id: paramId(req.params.id) } });
    if (req.user.role === 'PILOT' && shift.userId !== req.user.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    await prisma.staffShift.delete({ where: { id: paramId(req.params.id) } });
    emitAdmin('shift:deleted', { id: paramId(req.params.id) });
    res.json({ ok: true });
});
adminRouter.use(hideFromPilots);
adminRouter.get('/certificates', async (_req, res) => {
    res.json(await prisma.certificate.findMany({ orderBy: { createdAt: 'desc' } }));
});
adminRouter.post('/certificates', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const row = await prisma.certificate.create({ data: req.body });
    emitAdmin('certificate:created', { id: row.id });
    res.status(201).json(row);
});
adminRouter.patch('/certificates/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const row = await prisma.certificate.update({ where: { id: paramId(req.params.id) }, data: req.body });
    emitAdmin('certificate:updated', { id: row.id });
    res.json(row);
});
adminRouter.get('/waiting-room', async (req, res) => {
    const date = req.query.date ? startOfDay(new Date(String(req.query.date))) : undefined;
    const rows = await prisma.waitingRoomEntry.findMany({
        where: date ? { date } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
});
adminRouter.post('/waiting-room', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    const row = await prisma.waitingRoomEntry.create({ data: req.body });
    emitAdmin('waiting-room:created', { id: row.id });
    res.status(201).json(row);
});
adminRouter.delete('/waiting-room/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    await prisma.waitingRoomEntry.delete({ where: { id: paramId(req.params.id) } });
    emitAdmin('waiting-room:deleted', { id: paramId(req.params.id) });
    res.json({ ok: true });
});
adminRouter.get('/prices/flights', async (_req, res) => {
    res.json(await prisma.flightPrice.findMany({ orderBy: { sortOrder: 'asc' } }));
});
adminRouter.get('/prices/certificates', async (_req, res) => {
    res.json(await prisma.certificatePrice.findMany({ orderBy: { sortOrder: 'asc' } }));
});
adminRouter.get('/promos', async (_req, res) => {
    res.json(await prisma.promo.findMany());
});
adminRouter.patch('/prices/flights/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    res.json(await prisma.flightPrice.update({ where: { id: paramId(req.params.id) }, data: req.body }));
});
adminRouter.get('/accounts', requireRoles('ADMIN'), async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { fullName: 'asc' } });
    res.json(users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        login: u.login,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        color: u.color,
        pilotSimulators: u.pilotSimulators,
    })));
});
adminRouter.post('/accounts', requireRoles('ADMIN'), async (req, res) => {
    const body = z
        .object({
        login: z.string(),
        password: z.string().min(4),
        role: z.nativeEnum(UserRole),
        fullName: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        color: z.string().optional(),
        pilotSimulators: z.array(z.string()).optional(),
    })
        .parse(req.body);
    const user = await createUser(body);
    res.status(201).json(sanitizeUser(user));
});
adminRouter.patch('/accounts/:id', requireRoles('ADMIN'), async (req, res) => {
    const data = { ...req.body };
    if (data.password) {
        data.passwordHash = await hashPassword(data.password);
        delete data.password;
    }
    const user = await prisma.user.update({ where: { id: paramId(req.params.id) }, data });
    res.json(sanitizeUser(user));
});
adminRouter.get('/settings/documents', requireRoles('ADMIN'), async (_req, res) => {
    res.json(await prisma.settingDocument.findMany());
});
adminRouter.patch('/settings/documents/:key', requireRoles('ADMIN'), async (req, res) => {
    res.json(await prisma.settingDocument.update({
        where: { key: paramId(req.params.key) },
        data: { content: req.body.content },
    }));
});
adminRouter.get('/settings/contacts', requireRoles('ADMIN'), async (_req, res) => {
    res.json(await prisma.settingContact.findFirst());
});
adminRouter.put('/settings/contacts', requireRoles('ADMIN'), async (req, res) => {
    const existing = await prisma.settingContact.findFirst();
    if (existing) {
        res.json(await prisma.settingContact.update({ where: { id: existing.id }, data: req.body }));
        return;
    }
    res.status(201).json(await prisma.settingContact.create({ data: req.body }));
});
adminRouter.get('/settings/options/:category', requireRoles('ADMIN'), async (req, res) => {
    res.json(await prisma.optionListItem.findMany({
        where: { category: paramId(req.params.category) },
        orderBy: { sortOrder: 'asc' },
    }));
});
adminRouter.get('/analytics/overview', async (_req, res) => {
    const total = await prisma.booking.count({ where: { status: 'CONFIRMED' } });
    const b737 = await prisma.booking.count({
        where: { status: 'CONFIRMED', simulatorSlug: 'boeing-737' },
    });
    const mi2 = await prisma.booking.count({
        where: { status: 'CONFIRMED', simulatorSlug: 'mi-2' },
    });
    res.json({ total, b737, mi2 });
});
adminRouter.get('/email-log', requireRoles('ADMIN'), async (_req, res) => {
    res.json(await prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }));
});
adminRouter.post('/maintenance', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
    res.status(201).json(await prisma.maintenancePlan.create({ data: req.body }));
});
