import apiRouter from '@/api/api-router'
import errorMiddleware from '@/api/middleware/error-middleware'
import bodyParser from 'body-parser'
import { drizzle } from 'drizzle-orm/postgres-js'
import express from 'express'
import morgan from 'morgan'
import postgres from 'postgres'
import serverless from 'serverless-http'
import { DatabaseContext } from '../database/context'
import * as schema from '../database/schema'

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
app.use(apiRouter)

app.use(errorMiddleware)

export const handler = serverless(app)
