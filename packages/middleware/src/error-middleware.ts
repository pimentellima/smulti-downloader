import type { NextFunction, Request, Response } from 'express'
import { handleApiError } from '@shared/errors'

export default function errorMiddleware(
    err: any,
    request: Request,
    response: Response,
    next: NextFunction
) {
    console.log(err)
    const { error, status } = handleApiError(err)
    response.status(status).send({ status, error })
}
