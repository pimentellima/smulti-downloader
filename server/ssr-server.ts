import { createRequestHandler } from '@react-router/express'
import { drizzle } from 'drizzle-orm/postgres-js'
import express from 'express'
import postgres from 'postgres'
import { DatabaseContext } from '../database/context'
import * as schema from '../database/schema'
import morgan from 'morgan'
import languageMiddleware from '@/api/middleware/language-middleware'

declare module 'react-router' {
    interface AppLoadContext {
        VALUE_FROM_EXPRESS: string
    }
}

export const app = express()
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, { schema })
app.use(morgan('tiny'))
app.use((_, __, next) => DatabaseContext.run(db, next))
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
