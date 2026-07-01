import { addMonths, format, getDay, parseISO, startOfDay, subMonths } from 'date-fns';
export function toDateKey(d) {
    const date = typeof d === 'string' ? parseISO(d) : d;
    return format(startOfDay(date), 'yyyy-MM-dd');
}
export function isWeekend(d) {
    const day = getDay(d);
    return day === 0 || day === 6;
}
export function calendarRangeForRole(role, anchor = new Date()) {
    const today = startOfDay(anchor);
    if (role === 'PILOT')
        return { from: today, to: addMonths(today, 2) };
    return { from: subMonths(today, 4), to: addMonths(today, 12) };
}
export function getDayStatus(store, dateKey) {
    if (store.calendar[dateKey])
        return store.calendar[dateKey];
    const d = parseISO(dateKey);
    return isWeekend(d) ? 'HOLIDAY' : 'OPEN';
}
export function buildCalendarDays(store, from, to) {
    const days = [];
    let cursor = startOfDay(from);
    const end = startOfDay(to);
    while (cursor <= end) {
        const key = toDateKey(cursor);
        days.push({ date: key, status: getDayStatus(store, key) });
        cursor = new Date(cursor.getTime() + 86400000);
    }
    return days;
}
export function addMinutesToTime(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}
export function generateCode(len = 6) {
    return String(Math.floor(Math.random() * 10 ** len)).padStart(len, '0');
}
export function filterBookingsForRole(store, role, userId, date) {
    let rows = store.bookings;
    if (date)
        rows = rows.filter((b) => b.date === date);
    if (role === 'PILOT') {
        const user = store.users.find((u) => u.id === userId);
        const sims = user?.pilotSimulators ?? [];
        rows = rows.filter((b) => sims.includes(b.simulatorSlug));
    }
    return rows.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
