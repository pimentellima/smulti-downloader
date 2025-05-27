import { ApiError } from '@/api/errors'
import {
    createJobs,
    createRequest,
    getJobOrThrow,
    getJobsByRequestId,
    retryJobsByIds,
    retryJobsByRequestId,
    updateJob,
    type Job,
} from '@/lib/api/jobs'
import {
    createJobsSchema,
    downloadJobByIdSchema,
    downloadJobByRequestSchema,
    retryJobsSchema,
    type Format,
} from '@/lib/schemas/job'
import { addJobToSqsQueue } from '@/lib/sqs'
import { spawn } from 'child_process'
import { Router } from 'express'
import { PassThrough, Readable } from 'stream'
import { z } from 'zod'
import archiver from 'archiver'

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
                console.log(response)
            } catch (err) {
                await updateJob(job.id, { status: 'error' })
                throw err
            }
        }
        console.log({ requestId })
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

jobsRoute.get('/download/single', async (req, res, next) => {
    try {
        const { formatId, jobId } = downloadJobByIdSchema.parse(req.query)
        const job = await getJobOrThrow(jobId)
        const { ext, stream, title } = await createStreamForJobFormat(
            job,
            formatId
        )
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${title}.${ext}"`
        )
        res.setHeader('Content-Type', 'application/octet-stream')
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
                const { ext, stream, title } = await createStreamForJobFormat(
                    job,
                    formatId
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

async function createStreamForJobFormat(job: Job, formatId: string) {
    const videoFormats = job.json?.formats_video || []
    const audioFormats = job.json?.formats_audio || []
    const format = [...videoFormats, ...audioFormats].find(
        (format) => format.format_id === formatId
    )

    if (!format) {
        throw new ApiError({
            code: 'not_found',
            message: 'Format not found',
        })
    }
    if (format.acodec === 'none' && format.vcodec === 'none') {
        throw new ApiError({
            code: 'bad_request',
            message: 'Format has no audio or video codec',
        })
    }
    const sanitizedTitle = (job.title || job.id.slice(0, 5)).replace(
        /[^a-zA-Z0-9-_]/g,
        '_'
    )

    // video only
    if (format.vcodec !== 'none' && format.acodec === 'none') {
        const filteredSortedAudioFormats = audioFormats.sort((a, b) => {
            if (
                a.format_note?.includes('original') &&
                !b.format_note?.includes('original')
            )
                return -1
            if (
                format.format_note?.includes('original') &&
                !a.format_note?.includes('original')
            )
                return 1
            if (format.ext === 'mp4' && a.ext === 'm4a' && b.ext !== 'm4a')
                return -1
            if (format.ext === 'mp4' && b.ext === 'm4a' && a.ext !== 'm4a')
                return 1
            if (format.ext === 'webm' && a.ext === 'webm' && b.ext !== 'webm')
                return -1
            if (format.ext === 'webm' && b.ext === 'webm' && a.ext !== 'webm')
                return 1
            return a.filesize - b.filesize
        })
        const videoResponse = await fetch(format.url)
        const audioResponse = await fetch(filteredSortedAudioFormats[0]?.url!)
        if (!videoResponse.ok || !audioResponse.ok) {
            throw new ApiError({
                code: 'internal_server_error',
                message: 'Could not fetch video or audio response',
            })
        }
        const videoStream = Readable.fromWeb(
            // @ts-ignore: TypeScript may complain, but this works in Node.js >=18
            videoResponse.body as globalThis.ReadableStream
        )
        const audioStream = Readable.fromWeb(
            // @ts-ignore: TypeScript may complain, but this works in Node.js >=18
            audioResponse.body as globalThis.ReadableStream
        )

        const stream = combineAudioVideoStreams(audioStream, videoStream)
        return {
            title: sanitizedTitle,
            stream,
            ext: format.ext,
        }
    }

    const response = await fetch(format.url)
    if (!response.ok) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Could not fetch response',
        })
    }
    return {
        title: sanitizedTitle,
        stream: Readable.fromWeb(
            // @ts-ignore: TypeScript may complain, but this works in Node.js >=18
            response.body as globalThis.ReadableStream
        ),
        ext: format.ext,
    }
}

function combineAudioVideoStreams(
    audioStream: Readable,
    videoStream: Readable
) {
    const ffmpegPath = '/usr/bin/ffmpeg'
    let ffmpegProcess = spawn(
        ffmpegPath,
        [
            '-loglevel',
            '8',
            '-hide_banner',
            '-i',
            'pipe:3',
            '-i',
            'pipe:4',
            '-map',
            '0:a',
            '-map',
            '1:v',
            '-c',
            'copy',
            '-f',
            'matroska',
            'pipe:1',
        ],
        {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'inherit', 'pipe', 'pipe'],
        }
    )
    audioStream.pipe(ffmpegProcess.stdio[3] as NodeJS.WritableStream)
    videoStream.pipe(ffmpegProcess.stdio[4] as NodeJS.WritableStream)
    if (!ffmpegProcess.stdout) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Could not create ffmpeg process',
        })
    }
    return ffmpegProcess.stdout
}

export default jobsRoute
