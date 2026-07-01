import { BookingStatus, AuthCodeType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { addMinutesToTime, bookingConfirmCodeExpiresAt, bookingHoldExpiresAt, toDateKey, } from '../lib/dates.js';
import { generateCode } from '../lib/auth-utils.js';
import { sendEmail } from '../lib/mailer.js';
import { emitAdmin } from '../lib/socket.js';
export async function createPublicBooking(input) {
    const endTime = addMinutesToTime(input.startTime, input.durationMin);
    const holdExpiresAt = bookingHoldExpiresAt();
    const code = generateCode(6);
    const promoNote = input.isBirthdayPromo
        ? 'ДР-15%'
        : input.certificateNumber
            ? `EB-${input.simulatorSlug.toUpperCase()}-${input.certificateNumber}`
            : null;
    const booking = await prisma.booking.create({
        data: {
            date: new Date(input.date),
            startTime: input.startTime,
            endTime,
            durationMin: input.durationMin,
            simulatorSlug: input.simulatorSlug,
            name: input.name,
            phone: input.phone,
            email: input.email,
            paymentMethod: input.paymentMethod,
            comment: input.comment ?? '',
            isBirthdayPromo: input.isBirthdayPromo ?? false,
            birthdayDate: input.birthdayDate ? new Date(input.birthdayDate) : null,
            certificateNumber: input.certificateNumber,
            promoNote,
            status: BookingStatus.PENDING_CONFIRMATION,
            holdExpiresAt,
            confirmExpiresAt: bookingConfirmCodeExpiresAt(),
            paid: false,
        },
    });
    await prisma.authCode.create({
        data: {
            bookingId: booking.id,
            email: input.email,
            code,
            type: AuthCodeType.BOOKING_CONFIRM,
            expiresAt: bookingConfirmCodeExpiresAt(),
        },
    });
    await sendEmail(input.email, 'Код подтверждения бронирования Aviator', `Ваш код подтверждения: ${code}\nБронь действует 2 минуты до подтверждения.`);
    emitAdmin('booking:created', { id: booking.id, date: toDateKey(booking.date) });
    return { bookingId: booking.id, holdExpiresAt: booking.holdExpiresAt };
}
export async function confirmPublicBooking(bookingId, code) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking)
        throw new Error('NOT_FOUND');
    if (booking.status !== BookingStatus.PENDING_CONFIRMATION)
        throw new Error('INVALID_STATE');
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.EXPIRED },
        });
        throw new Error('HOLD_EXPIRED');
    }
    const authCode = await prisma.authCode.findFirst({
        where: {
            bookingId,
            code,
            type: AuthCodeType.BOOKING_CONFIRM,
            usedAt: null,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
    });
    if (!authCode)
        throw new Error('INVALID_CODE');
    await prisma.authCode.update({ where: { id: authCode.id }, data: { usedAt: new Date() } });
    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: BookingStatus.CONFIRMED,
            holdExpiresAt: null,
        },
    });
    emitAdmin('booking:updated', { id: updated.id, date: toDateKey(updated.date) });
    return updated;
}
export async function resendBookingCode(bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.PENDING_CONFIRMATION) {
        throw new Error('INVALID_STATE');
    }
    const lastCode = await prisma.authCode.findFirst({
        where: { bookingId, type: AuthCodeType.BOOKING_CONFIRM },
        orderBy: { createdAt: 'desc' },
    });
    if (lastCode && Date.now() - lastCode.createdAt.getTime() < 60_000) {
        throw new Error('RESEND_TOO_SOON');
    }
    const code = generateCode(6);
    await prisma.authCode.create({
        data: {
            bookingId,
            email: booking.email,
            code,
            type: AuthCodeType.BOOKING_CONFIRM,
            expiresAt: bookingConfirmCodeExpiresAt(),
        },
    });
    await sendEmail(booking.email, 'Новый код подтверждения бронирования Aviator', `Ваш код: ${code}`);
    return { ok: true };
}
export async function expireStaleBookings() {
    const now = new Date();
    const expired = await prisma.booking.updateMany({
        where: {
            status: BookingStatus.PENDING_CONFIRMATION,
            holdExpiresAt: { lt: now },
        },
        data: { status: BookingStatus.EXPIRED },
    });
    return expired.count;
}
