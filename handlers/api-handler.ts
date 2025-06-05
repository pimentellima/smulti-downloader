import app from '../server/api-server'
import serverless from 'serverless-http'

export const handler = serverless(app)