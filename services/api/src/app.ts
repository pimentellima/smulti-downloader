import bodyParser from 'body-parser'
import express from 'express'
import jobsRoute from './routes/jobs/route'
import downloadRoute from './routes/download/route'
import compression from 'compression'
import errorMiddleware from '@middleware/error-middleware'

const app = express()

app.use(compression())
app.disable('x-powered-by')
app.use(bodyParser.json())

app.use('/api/jobs', jobsRoute)
app.use('/api/downloads', downloadRoute)

app.get('/', (_req, res) => {
    res.send('Server running on dev mode')
})

app.use(errorMiddleware)

export { app }
