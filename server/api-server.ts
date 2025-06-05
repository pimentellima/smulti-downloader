import express from 'express'
import bodyParser from 'body-parser'
import jobsRoute from '@/api/routes/jobs/route'
import errorMiddleware from '@/api/middleware/error-middleware'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { DatabaseContext } from '../database/context'
import * as schema from '../database/schema'
import morgan from 'morgan'
import downloadRoute from '@/api/routes/download/route'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, { schema })

const app = express()
app.use(morgan('tiny'))
app.use(bodyParser.json())
app.use((_, __, next) => DatabaseContext.run(db, next))

app.use('/', (req, res, next) => {
    res.send('Welcome to the Smulti API')
})
app.use('/jobs', jobsRoute)
app.use('/downloads', downloadRoute)

app.use(errorMiddleware)

export default app
