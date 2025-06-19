import errorMiddleware from '@middleware/error-middleware'
import languageMiddleware from '@middleware/language-middleware'
import { createRequestHandler } from '@react-router/express'
import bodyParser from 'body-parser'
import express from 'express'
import 'react-router'

declare module 'react-router' {
    interface AppLoadContext {
        VALUE_FROM_EXPRESS: string
    }
}

const app = express()
app.use(bodyParser.json())

app.use(
    createRequestHandler({
        build: () => import('virtual:react-router/server-build'),
        getLoadContext() {
            return {
                VALUE_FROM_EXPRESS: 'Hello from Express',
            }
        },
    }),
)
app.use(languageMiddleware)

app.use(errorMiddleware)

export { app }
