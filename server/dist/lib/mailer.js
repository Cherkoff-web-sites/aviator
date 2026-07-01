import { prisma } from './prisma.js';
/** В dev/staging письма пишутся в EmailLog и в консоль. Позже — SMTP. */
export async function sendEmail(to, subject, body) {
    await prisma.emailLog.create({ data: { to, subject, body } });
    console.log(`[EMAIL] to=${to} subject=${subject}\n${body}`);
}
