import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
export async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const payload = verifyToken(token);
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        req.user = {
            id: user.id,
            role: user.role,
            login: user.login,
            pilotSimulators: user.pilotSimulators,
        };
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
}
export function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    };
}
export function hideFromPilots(req, res, next) {
    if (req.user?.role === 'PILOT') {
        res.status(403).json({ error: 'Forbidden for pilot role' });
        return;
    }
    next();
}
