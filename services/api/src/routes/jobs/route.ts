import {
    batchUpdateJobStatus,
    createJobs,
    createRequest,
    getItemsInQueueCount,
    getJob,
    getJobsByRequestId,
    getMergedVideoByFormatId,
    retryJobsByIds,
    retryJobsByRequestId,
    updateJob,
    updateJobStatus,
    updateMergedFormatStatus,
    upsertMergedFormat,
} from '@shared/api'
import {
    addJobsToProcessQueue,
    addMergedFormatToConvertQueue,
} from '@shared/aws/sqs'
import { ApiError } from '@shared/errors'
import { MAX_CONCURRENT_JOBS } from '@utils/constants'
import {
    createJobsSchema,
    jobFormatSchema,
    retryJobsSchema,
} from '@validations/schemas/job'
import { Router } from 'express'
import { z } from 'zod'
import { matchAudioFormatForVideo } from '../../utils/sort-audio-formats'

const jobsRoute = Router()

jobsRoute.get('/:requestId', async (req, res, next) => {
    try {
        const requestId = z.string().uuid().parse(req.params.requestId)

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
                title: '-',
                status: 'waiting-to-process',
                requestId,
            })),
        )

        // todo: checa runningJobs por usuário
        const runningJobs = await getItemsInQueueCount()

        const jobsToProcess = jobs
            .slice(0, MAX_CONCURRENT_JOBS - runningJobs)
            .map((job) => job.id)

        await batchUpdateJobStatus(jobsToProcess, 'queued-processing')

        const result = await addJobsToProcessQueue(jobsToProcess)

        const erroredJobs =
            result.Failed?.map((f) => f.Id).filter(
                (id): id is string => typeof id === 'string',
            ) || []
        await batchUpdateJobStatus(erroredJobs, 'error-processing')

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

jobsRoute.post('/:jobId/:formatId', async (req, res, next) => {
    try {
        const { formatId, jobId } = jobFormatSchema.parse({
            jobId: req.params.jobId,
            formatId: req.params.formatId,
        })
        const job = await getJob(jobId)
        const format = job.formats?.find((f) => f.id === formatId)

        if (!format) {
            throw new ApiError({
                code: 'not_found',
                message: `Format with id ${formatId} not found for job ${jobId}`,
            })
        }

        if (job.status !== 'finished-processing') {
            throw new ApiError({
                code: 'unprocessable_entity',
                message: `Job ${jobId} is not finished processing`,
            })
        }

        // todo: checa quantos jobs o usuário pode adicionar na fila
        const audioFormat = matchAudioFormatForVideo(format, job.formats)
        const insertedMergedFormat = await upsertMergedFormat(
            jobId,
            'waiting-to-convert',
            formatId,
            audioFormat.id,
        )
        const totalItemsInQueue = await getItemsInQueueCount()
        if (insertedMergedFormat && totalItemsInQueue < MAX_CONCURRENT_JOBS) {
            try {
                await updateMergedFormatStatus(
                    insertedMergedFormat.id,
                    'queued-converting',
                )
                await addMergedFormatToConvertQueue(insertedMergedFormat.id)
            } catch (e) {
                await updateMergedFormatStatus(jobId, 'waiting-to-convert')
                throw e
            }
        }

        res.status(200)
    } catch (err) {
        next(err)
    }
})

jobsRoute.get('/:jobId/:formatId', async (req, res, next) => {
    try {
        const { formatId, jobId } = jobFormatSchema.parse({
            jobId: req.params.jobId,
            formatId: req.params.formatId,
        })
        const job = await getJob(jobId)
        const format = job.formats?.find((f) => f.id === formatId)

        if (!format) {
            throw new ApiError({
                code: 'not_found',
                message: `Format with id ${formatId} not found for job ${jobId}`,
            })
        }

        let downloadUrl: string | undefined

        if (format.acodec !== 'none') {
            downloadUrl = format.url
        } else {
            const mergedVideo = await getMergedVideoByFormatId(formatId)
            if (mergedVideo?.downloadUrl) {
                downloadUrl = mergedVideo.downloadUrl
            }
        }
        res.json({
            job,
            downloadUrl,
        })
    } catch (err) {
        next(err)
    }
})

export default jobsRoute
