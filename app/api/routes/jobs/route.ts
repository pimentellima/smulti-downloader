import { ApiError } from '@/api/errors'
import {
    createJobs,
    createRequest,
    createStreamForJobFormat,
    getJobOrThrow,
    getJobsByRequestId,
    retryJobsByIds,
    retryJobsByRequestId,
    updateJob
} from '@/lib/api'
import {
    createJobsSchema,
    downloadJobByIdSchema,
    downloadJobByRequestSchema,
    retryJobsSchema,
} from '@/lib/schemas/job'
import { addJobToSqsQueue } from '@/lib/sqs'
import archiver from 'archiver'
import { Router } from 'express'
import { PassThrough } from 'stream'
import { z } from 'zod'

const jobsRoute = Router()

jobsRoute.get('/', async (req, res, next) => {
    try {
        const { requestId } = z
            .object({
                requestId: z.string().uuid(),
            })
            .parse(req.query)
        if (!requestId) {
            throw new ApiError({
                code: 'bad_request',
                message: 'requestId is required',
            })
        }

        const jobs = await getJobsByRequestId(requestId)

        res.json(jobs)
    } catch (err) {
        next(err)
    }
})

jobsRoute.post('/', async (req, res, next) => {
    try {
        const postJobsData = createJobsSchema.parse(req.body)
        const requestId = postJobsData.requestId || (await createRequest()).id
        const urls = postJobsData.urls
        const jobs = await createJobs(
            urls.map((url) => ({
                url,
                title: 'Untlited',
                requestId,
            }))
        )

        for (const job of jobs) {
            try {
                const response = await addJobToSqsQueue(job.id)
            } catch (err) {
                await updateJob(job.id, { status: 'error' })
                throw err
            }
        }
        res.status(200).json({ requestId })
    } catch (err) {
        next(err)
    }
})

jobsRoute.post('/retry', async (req, res, next) => {
    try {
        const { ids, requestId } = retryJobsSchema.parse(req.body)

        if (ids) {
            await retryJobsByIds(ids)
        } else {
            await retryJobsByRequestId(requestId!)
        }

        res.status(200)
    } catch (err) {
        next(err)
    }
})

jobsRoute.put('/:jobId/cancel', async (req, res, next) => {
    try {
        const { jobId } = req.params
        await updateJob(jobId, { status: 'cancelled' })
        res.status(200)
    } catch (err) {
        next(err)
    }
})

jobsRoute.get('/download/single', async (req, res, next) => {
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

jobsRoute.get('/download/batch', async (req, res, next) => {
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
        archive.finalize()
        zipStream.pipe(res)
    } catch (err) {
        next(err)
    }
})

export default jobsRoute
