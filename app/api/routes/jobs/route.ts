import {
    createJobs,
    createRequest,
    getJobsByRequestId,
    retryJobsByIds,
    retryJobsByRequestId,
    updateJob
} from '@/lib/api'
import {
    createJobsSchema,
    retryJobsSchema
} from '@/lib/schemas/job'
import { addJobToSqsQueue } from '@/lib/sqs'
import { Router } from 'express'
import { z } from 'zod'

const jobsRoute = Router()

jobsRoute.get('/', async (req, res, next) => {
    try {
        const { requestId } = z
            .object({
                requestId: z.string().uuid(),
            })
            .parse(req.query)

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

export default jobsRoute
