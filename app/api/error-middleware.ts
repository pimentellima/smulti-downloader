import type { NextFunction, Request, Response } from 'express'
import { handleApiError } from './errors'

function errorMiddleware(
    err: any,
    request: Request,
    response: Response,
    next: NextFunction
) {
    const { error, status } = handleApiError(err)
    response.status(status).send({ status, error })
}

export default errorMiddleware
