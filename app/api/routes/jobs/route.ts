import { ApiError } from '@/api/errors'
import {
    createJobs,
    createRequest,
    getJobsByRequestId,
    getRequestById,
    retryJobsByIds,
    retryJobsByRequestId,
    updateJob,
} from '@/lib/api/jobs'
import { createJobsSchema, retryJobsSchema } from '@/lib/schemas/job'
import { sendMessageToSqs } from '@/lib/sqs'
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
        const { urls, requestId } = createJobsSchema.parse(req.body)
        let reqId = requestId
        if (requestId) {
            await getRequestById(requestId)
            await createJobs(
                urls.map((url) => ({
                    url,
                    title: 'Untlited',
                    requestId,
                }))
            )
        } else {
            const request = await createRequest()
            reqId = request.id
            await createJobs(
                urls.map((url) => ({
                    url,
                    title: 'Untlited',
                    requestId: request.id,
                }))
            )
        }

        const sqsRes = await sendMessageToSqs(reqId!)
        console.log('Resposta do SQS:', sqsRes)
        res.status(200).json({ requestId: reqId })
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
