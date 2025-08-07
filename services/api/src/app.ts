import bodyParser from 'body-parser'
import express from 'express'
import jobsRoute from './routes/jobs/route'
import compression from 'compression'
import errorMiddleware from '@middleware/error-middleware'

const app = express()

app.use(compression())
app.disable('x-powered-by')
app.use(bodyParser.json())

app.use('/api/jobs', jobsRoute)

app.get('/', (_req, res) => {
    res.send('Welcome to Smulti API.')
})

app.use(errorMiddleware)

export { app }
