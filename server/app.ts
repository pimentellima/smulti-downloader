import { createRequestHandler } from '@react-router/express'
import { drizzle } from 'drizzle-orm/postgres-js'
import express from 'express'
import postgres from 'postgres'
import 'react-router'
import { DatabaseContext } from '~/database/context'
import * as schema from '~/database/schema'
import jobsRoute from '@/api/routes/jobs/route'
import errorMiddleware from '@/api/error-middleware'
import bodyParser from 'body-parser'

declare module 'react-router' {
    interface AppLoadContext {
        VALUE_FROM_EXPRESS: string
    }
}

export const app = express()

app.use(bodyParser.json())

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, { schema })
app.use((_, __, next) => DatabaseContext.run(db, next))

app.get('/api', (req, res) => {
    res.json({ message: 'Hello from API' })
})
app.use('/api/jobs', jobsRoute)

app.use(
    createRequestHandler({
        build: () => import('virtual:react-router/server-build'),
        getLoadContext() {
            return {
                VALUE_FROM_EXPRESS: 'Hello from Express',
            }
        },
    })
)
app.use(errorMiddleware)
