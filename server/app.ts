import { createRequestHandler } from '@react-router/express'
import { drizzle } from 'drizzle-orm/postgres-js'
import express from 'express'
import postgres from 'postgres'
import 'react-router'
import { database, DatabaseContext } from '~/database/context'
import * as schema from '~/database/schema'
import jobsRoute from '@/api/routes/jobs/route'
import errorMiddleware from '@/api/middleware/error-middleware'
import bodyParser from 'body-parser'
import languageMiddleware from '@/api/middleware/language-middleware'
import { sql } from 'drizzle-orm'

declare module 'react-router' {
    interface AppLoadContext {
        VALUE_FROM_EXPRESS: string
    }
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, { schema })

export const app = express()

app.use(bodyParser.json())
app.use((_, __, next) => DatabaseContext.run(db, next))
app.post('/api/test', async (req, res) => {
    const db = database()
    try {
        await db.execute(sql`SELECT 1`);
        res.json({ success: true, message: 'Database connection successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Database connection failed', error: String(error) });
    }
})
app.get('/api', (req, res) => {
    res.json({ message: 'Hello from API' })
})
app.use('/api/jobs', jobsRoute)
app.use(languageMiddleware)
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
