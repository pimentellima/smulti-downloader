import { app } from '../server/ssr-server'
import serverless from 'serverless-http'

export const handler = serverless(app)