import { getLocale, locales } from '@shared/locale'
import type { NextFunction, Request, Response } from 'express'

export default function languageMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const pathname = req.path
    if (pathname.includes('/api')) return next()
    // Skip the middleware if the URL already contains a file extension
    if (/\.[^\/]+$/.test(pathname)) return next()
    const queryString = req.url.includes('?')
        ? req.url.substring(req.url.indexOf('?'))
        : ''

    let routeSegments = pathname.split('/').filter(Boolean)

    const pathnameHasLocale =
        routeSegments[0] &&
        locales.some((locale) => locale === routeSegments[0])

    if (pathnameHasLocale) return next()

    const locale = getLocale(req)
    routeSegments[0] = locale

    res.redirect(`/${routeSegments.join('/')}${queryString}`)
}
