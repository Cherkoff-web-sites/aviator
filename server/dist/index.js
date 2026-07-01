import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { apiRouter } from './routes/api.js';
import { initSocket } from './lib/socket.js';
const app = express();
const port = Number(process.env.PORT ?? 3001);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', apiRouter);
const server = createServer(app);
initSocket(server);
server.listen(port, () => {
    console.log(`API (JSON store) http://localhost:${port}`);
});
