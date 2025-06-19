import {
    createJobs,
    createRequest,
    getJobsByRequestId,
    retryJobsByIds,
    retryJobsByRequestId,
    updateJob,
} from '@shared/api'
import { createJobsSchema, retryJobsSchema } from '@validations/schemas/job'
import { addJobToSqsQueue } from '@shared/aws/sqs'
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
        let requestId = postJobsData.requestId
        if (!requestId) {
            const newRequest = await createRequest()
            if (!newRequest || !newRequest.id) {
                throw new Error('Failed to create a new request')
            }
            requestId = newRequest.id
        }
        const urls = postJobsData.urls
        const jobs = await createJobs(
            urls.map((url) => ({
                url,
                title: 'Untlited',
                requestId,
            })),
        )

        for (const job of jobs) {
            try {
                await addJobToSqsQueue(job.id)
            } catch (err) {
                await updateJob(job.id, { status: 'error' })
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
