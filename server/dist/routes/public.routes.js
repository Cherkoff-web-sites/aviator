import { Router } from 'express';
import { z } from 'zod';
import { confirmPublicBooking, createPublicBooking, resendBookingCode, } from '../services/booking.service.js';
import { getCalendarDays } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { addMonths, startOfDay, subMonths } from 'date-fns';
export const publicRouter = Router();
publicRouter.get('/calendar', async (_req, res) => {
    const today = startOfDay(new Date());
    const from = subMonths(today, 1);
    const to = addMonths(today, 3);
    const days = await getCalendarDays(from, to);
    res.json({ days });
});
publicRouter.get('/prices/flights', async (_req, res) => {
    const rows = await prisma.flightPrice.findMany({ orderBy: [{ sortOrder: 'asc' }, { durationMin: 'asc' }] });
    res.json(rows);
});
publicRouter.get('/prices/certificates', async (_req, res) => {
    const rows = await prisma.certificatePrice.findMany({ orderBy: [{ sortOrder: 'asc' }, { durationMin: 'asc' }] });
    res.json(rows);
});
publicRouter.get('/promos', async (_req, res) => {
    const rows = await prisma.promo.findMany({ where: { active: true } });
    res.json(rows);
});
publicRouter.get('/contacts', async (_req, res) => {
    const contact = await prisma.settingContact.findFirst();
    res.json(contact);
});
publicRouter.get('/gallery/:serviceSlug', async (req, res) => {
    const photos = await prisma.galleryPhoto.findMany({
        where: { serviceSlug: req.params.serviceSlug },
        orderBy: { sortOrder: 'asc' },
    });
    res.json(photos);
});
const bookingSchema = z.object({
    date: z.string(),
    startTime: z.string(),
    durationMin: z.number().int().positive(),
    simulatorSlug: z.string(),
    name: z.string().min(1),
    phone: z.string().min(3),
    email: z.string().email(),
    paymentMethod: z.enum(['OFFLINE', 'ONLINE']).default('OFFLINE'),
    comment: z.string().optional(),
    isBirthdayPromo: z.boolean().optional(),
    birthdayDate: z.string().optional(),
    certificateNumber: z.string().optional(),
});
publicRouter.post('/bookings', async (req, res) => {
    try {
        const body = bookingSchema.parse(req.body);
        const result = await createPublicBooking({
            ...body,
            paymentMethod: body.paymentMethod,
        });
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ error: String(e) });
    }
});
publicRouter.post('/bookings/:id/confirm', async (req, res) => {
    try {
        const booking = await confirmPublicBooking(req.params.id, String(req.body.code ?? ''));
        res.json(booking);
    }
    catch (e) {
        const msg = String(e);
        const code = msg.includes('INVALID_CODE') ? 400 : msg.includes('HOLD_EXPIRED') ? 410 : 400;
        res.status(code).json({ error: msg });
    }
});
publicRouter.post('/bookings/:id/resend-code', async (req, res) => {
    try {
        await resendBookingCode(req.params.id);
        res.json({ ok: true });
    }
    catch (e) {
        const msg = String(e);
        res.status(msg.includes('RESEND_TOO_SOON') ? 429 : 400).json({ error: msg });
    }
});
publicRouter.get('/settings/booking-window', async (_req, res) => {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'booking_window_months' } });
    res.json({ months: row ? Number(row.value) : 3 });
});
