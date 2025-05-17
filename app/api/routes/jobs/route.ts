import { ApiError } from '@/api/errors'
import {
    createJobs,
    findOrCreateRequestById,
    getJobsByRequestId,
    getRequestById,
    retryJobsByIds,
    retryJobsByRequestId,
    updateJob,
} from '@/lib/api/jobs'
import { createJobsSchema, retryJobsSchema } from '@/lib/schemas/job'
import { addJobToSqsQueue } from '@/lib/sqs'
import { Router } from 'express'
import { z } from 'zod'

const jobsQuerySchema = z.object({
    requestId: z.string().uuid(), // por exemplo
})

const jobsRoute = Router()

jobsRoute.get('/', async (req, res, next) => {
    try {
        const { requestId } = jobsQuerySchema.parse(req.query)
        if (!requestId) {
            throw new ApiError({
                code: 'bad_request',
                message: 'requestId is required',
            })
        }

        const jobs = await getJobsByRequestId(requestId, {
            filterCancelled: true,
        })

        res.json(jobs)
    } catch (err) {
        next(err)
    }
})

jobsRoute.post('/', async (req, res, next) => {
    try {
        const postJobsData = createJobsSchema.parse(req.body)
        const { id: requestId } = await findOrCreateRequestById(
            postJobsData.requestId ?? undefined
        )
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
                await addJobToSqsQueue(job.id)
            } catch (err) {
                await updateJob(job.id, { status: 'error' })
                throw err
            }
        }

        res.status(200).json({ requestId })
    } catch (err) {
        console.log(err)
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

export default jobsRoute
