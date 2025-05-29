import { ApiError } from '@/api/errors'
import {
    createStreamForJobFormat,
    getJobOrThrow,
    getJobsByRequestId
} from '@/lib/api'
import {
    downloadJobByIdSchema,
    downloadJobByRequestSchema
} from '@/lib/schemas/job'
import archiver from 'archiver'
import { Router } from 'express'
import { PassThrough } from 'stream'

const downloadRoute = Router()

downloadRoute.get('/single', async (req, res, next) => {
    try {
        const { formatId, jobId } = downloadJobByIdSchema.parse(req.query)
        const job = await getJobOrThrow(jobId)
        const format = job.formats.find((f) => f.formatId === formatId)
        if (!format) {
            throw new ApiError({
                code: 'not_found',
                message: 'Format not found for this job',
            })
        }

        const { ext, stream, title } = await createStreamForJobFormat(
            job,
            format
        )
        res.setHeader('Content-Type', `application/octet-stream`)
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${title}.${ext}"`
        )
        stream.pipe(res)
    } catch (err) {
        next(err)
    }
})

downloadRoute.get('/batch', async (req, res, next) => {
    try {
        const { formatId, requestId } = downloadJobByRequestSchema.parse(
            req.query
        )
        const jobs = await getJobsByRequestId(requestId)
        const zipStream = new PassThrough()
        const archive = archiver('zip', {
            zlib: { level: 5 },
        })
        archive.pipe(zipStream)
        for (const job of jobs) {
            try {
                const format = job.formats.find((f) => f.formatId === formatId)
                if (!format) continue

                const { ext, title, stream } = await createStreamForJobFormat(
                    job,
                    format
                )
                archive.append(stream, {
                    name: `${title}.${ext}`,
                })
            } catch (err) {
                console.error(`Error adding ${job.id} (${job.title}):`, err)
            }
        }
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${requestId.slice(0, 5)}.zip"`
        )
        archive.finalize()
        zipStream.pipe(res)
    } catch (err) {
        next(err)
    }
})

export default downloadRoute
