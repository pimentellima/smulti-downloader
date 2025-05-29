import { ApiError } from '@/api/errors'

export function getKeyFromS3Url(url: string): string {
    try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        return pathname.startsWith('/') ? pathname.slice(1) : pathname
    } catch (error) {
        console.error('Invalid S3 URL:', error)
        throw new ApiError({ code: 'bad_request', message: 'Invalid S3 URL' })
    }
}
