import { ApiError } from '@/api/errors'
import {
    and,
    eq,
    not,
    inArray,
    type InferInsertModel,
    type InferSelectModel,
} from 'drizzle-orm'
import { database, type DatabaseType } from '../../database/context'
import * as schema from '../../database/schema'
import type { Format, JobStatus } from './schemas/job'
import { S3_URL_EXPIRES_IN_SECONDS } from './constants'
import { createPresignedS3Url, getS3FileStream, uploadFromStream } from './s3'
import { PassThrough, Readable } from 'stream'
import { spawn } from 'child_process'
import { sanitizeTitle } from './utils'
import { getKeyFromS3Url } from './get-key-from-s3-url'
import archiver from 'archiver'

export type Job = InferSelectModel<typeof schema.jobs> & {
    formats: InferSelectModel<typeof schema.formats>[]
}

export async function getJobOrThrow(
    id: string,
    db?: DatabaseType
): Promise<Job> {
    db = db || database()
    const job = await db.query.jobs.findFirst({
        where: eq(schema.jobs.id, id),
        with: {
            formats: true,
        },
    })

    if (!job) {
        throw new ApiError({
            code: 'not_found',
            message: `Job not found`,
        })
    }

    return job
}

export async function getJobsByRequestId(requestId: string): Promise<Job[]> {
    const db = database()

    return await db.query.jobs.findMany({
        with: {
            formats: true,
        },
        where: and(
            eq(schema.jobs.requestId, requestId),
            not(eq(schema.jobs.status, 'cancelled'))
        ),
    })
}

export async function getRequestById(requestId: string) {
    const db = database()

    const request = await db.query.requests.findFirst({
        where: and(eq(schema.requests.id, requestId)),
    })

    if (!request) {
        throw new ApiError({
            code: 'not_found',
            message: `Request not found`,
        })
    }

    return request
}

export async function createRequest() {
    const db = database()
    const [request] = await db.insert(schema.requests).values({}).returning()

    return request
}

export async function createJobs(
    jobs: InferInsertModel<typeof schema.jobs>[],
    tx?: DatabaseType
) {
    const db = tx || database()

    return await db.insert(schema.jobs).values(jobs).returning()
}

export async function retryJobsByRequestId(requestId: string) {
    const db = database()

    const jobs = await db
        .update(schema.jobs)
        .set({ status: 'queued' })
        .where(eq(schema.jobs.requestId, requestId))
        .returning()

    if (!jobs) {
        throw new ApiError({
            code: 'not_found',
            message: `Job not found`,
        })
    }

    return jobs
}

export async function retryJobsByIds(ids: string[]) {
    const db = database()

    const [job] = await db
        .update(schema.jobs)
        .set({ status: 'queued' })
        .where(inArray(schema.jobs.id, ids))
        .returning()

    if (!job) {
        throw new ApiError({
            code: 'not_found',
            message: `Job not found`,
        })
    }

    return job
}

export async function updateJob(id: string, data: Partial<Omit<Job, 'id'>>) {
    const db = database()

    const job = await db
        .update(schema.jobs)
        .set(data)
        .where(eq(schema.jobs.id, id))
        .returning()

    if (!job) {
        throw new ApiError({
            code: 'not_found',
            message: `Job not found`,
        })
    }

    return job
}

export const updateJobStatus = async (
    id: string,
    status: JobStatus,
    db?: DatabaseType
) => {
    db = db || database()

    const job = await db
        .update(schema.jobs)
        .set({ status })
        .where(eq(schema.jobs.id, id))
        .returning()

    if (!job) {
        throw new ApiError({
            code: 'not_found',
            message: `Job not found`,
        })
    }

    return job
}

export async function createStreamForJobFormat(
    job: Job & { formats: Format[] },
    format: Format
) {
    if (format.acodec === 'none' && format.vcodec === 'none') {
        throw new ApiError({
            code: 'bad_request',
            message: 'Format has no audio or video codec',
        })
    }
    const sanitizedTitle = sanitizeTitle(job.title || job.id.slice(0, 5))

    // video only
    if (format.vcodec !== 'none' && format.acodec === 'none') {
        const audioFormats = job.formats.filter(
            (f) => f.acodec !== 'none' && f.vcodec === 'none'
        )
        const filteredSortedAudioFormats = audioFormats.sort((a, b) => {
            if (
                a.formatNote?.includes('original') &&
                !b.formatNote?.includes('original')
            )
                return -1
            if (
                format.formatNote?.includes('original') &&
                !a.formatNote?.includes('original')
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
            return (a.filesize || 0) - (b.filesize || 0)
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
