import apiRouter from '@/api/api-router'
import errorMiddleware from '@/api/middleware/error-middleware'
import languageMiddleware from '@/api/middleware/language-middleware'
import { createRequestHandler } from '@react-router/express'
import bodyParser from 'body-parser'
import { drizzle } from 'drizzle-orm/postgres-js'
import express from 'express'
import postgres from 'postgres'
import 'react-router'
import { DatabaseContext } from '../database/context'
import * as schema from '../database/schema'

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

app.use('/api', apiRouter)

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
app.use(languageMiddleware)

app.use(errorMiddleware)
