import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { apiRouter } from './routes/api.js'
import { initSocket } from './lib/socket.js'
import { ensureUploadDir, UPLOAD_DIR } from './lib/uploads.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const host = process.env.BIND_HOST ?? '0.0.0.0'

ensureUploadDir()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '45mb' }))
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    fallthrough: false,
    setHeaders(res) {
      // Не кэшируем «битый» первый ответ у CDN/браузера надолго.
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('X-Content-Type-Options', 'nosniff')
    },
  }),
)

app.use('/api', apiRouter)

const server = createServer(app)
initSocket(server)

server.listen(port, host, () => {
  console.log(`API (JSON store) http://${host}:${port}`)
})
