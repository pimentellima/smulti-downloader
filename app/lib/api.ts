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

export async function createJobs(jobs: InferInsertModel<typeof schema.jobs>[]) {
    const db = database()

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

export async function updateFormatDownloadUrl(
    formatId: string,
    url: string,
    expiresAt: Date
) {
    const db = database()

    const format = await db
        .update(schema.formats)
        .set({ downloadUrl: url, downloadUrlExpiresAt: expiresAt })
        .where(eq(schema.formats.formatId, formatId))
        .returning()

    if (!format) {
        throw new ApiError({
            code: 'not_found',
            message: `Format not found`,
        })
    }

    return format
}

export async function getDownloadUrlByRequestAndFormatId(
    requestId: string,
    formatId: string
) {
    const db = database()

    const requestDownloadUrl = await db.query.requestDownloadUrl.findFirst({
        where: and(
            eq(schema.requestDownloadUrl.requestId, requestId),
            eq(schema.requestDownloadUrl.formatId, formatId)
        ),
    })

    return requestDownloadUrl
}

export async function upsertRequestDownloadUrl(
    requestId: string,
    formatId: string,
    url: string,
    expiresAt: Date
) {
    const db = database()

    const [requestDownloadUrl] = await db
        .insert(schema.requestDownloadUrl)
        .values({
            requestId,
            formatId,
            downloadUrl: url,
            downloadUrlExpiresAt: expiresAt,
        })
        .onConflictDoUpdate({
            target: [
                schema.requestDownloadUrl.requestId,
                schema.requestDownloadUrl.formatId,
            ],
            set: {
                downloadUrl: url,
                downloadUrlExpiresAt: expiresAt,
            },
        })
        .returning()

    return requestDownloadUrl
}

export async function refreshDownloadUrl(
    formatId: string,
    downloadUrl: string,
    downloadUrlExpiresAt: Date | null
) {
    let url = downloadUrl
    const urlExpiresAt = new Date(Date.now() + S3_URL_EXPIRES_IN_SECONDS * 1000)
    if (downloadUrlExpiresAt && downloadUrlExpiresAt < new Date()) {
        const key = getKeyFromS3Url(downloadUrl)
        url = await createPresignedS3Url(key, S3_URL_EXPIRES_IN_SECONDS)
        await updateFormatDownloadUrl(formatId, url, urlExpiresAt)
    }
    return url
}

export async function obtainDownloadUrlForJobFormat(
    job: Job,
    formatId: string
) {
    const format = job.formats.find((f) => f.formatId === formatId)
    if (!format) {
        throw new ApiError({
            code: 'not_found',
            message: 'Format not found for this job',
        })
    }
    const urlExpiresAt = new Date(Date.now() + S3_URL_EXPIRES_IN_SECONDS * 1000)
    if (format.downloadUrl) {
        return await refreshDownloadUrl(
            formatId,
            format.downloadUrl,
            format.downloadUrlExpiresAt
        )
    }

    const { ext, title, stream } = await createStreamForJobFormat(job, format)
    const pass = new PassThrough()
    stream.pipe(pass)
    const s3Key = `jobs/${job.id}/${formatId}/${title}.${ext}`
    await uploadFromStream(s3Key, pass)
    const url = await createPresignedS3Url(s3Key, S3_URL_EXPIRES_IN_SECONDS)
    await updateFormatDownloadUrl(formatId, url, urlExpiresAt)
    return url
}

export async function obtainDownloadUrlForRequestFormat(
    requestId: string,
    formatId: string
) {
    const downloadUrl = await getDownloadUrlByRequestAndFormatId(
        requestId,
        formatId
    )
    if (downloadUrl) {
        if (downloadUrl.downloadUrlExpiresAt < new Date()) {
            const key = getKeyFromS3Url(downloadUrl.downloadUrl)
            const url = await createPresignedS3Url(
                key,
                S3_URL_EXPIRES_IN_SECONDS
            )
            const urlExpiresAt = new Date(
                Date.now() + S3_URL_EXPIRES_IN_SECONDS * 1000
            )
            const requestDownloadUrl = await upsertRequestDownloadUrl(
                requestId,
                formatId,
                url,
                urlExpiresAt
            )
            return requestDownloadUrl.downloadUrl
        }
        return downloadUrl.downloadUrl
    }
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
            if (format.downloadUrl) {
                const url = await refreshDownloadUrl(
                    formatId,
                    format.downloadUrl,
                    format.downloadUrlExpiresAt
                )
                const key = getKeyFromS3Url(url)
                const s3Stream = await getS3FileStream(key)
                const stream = Readable.from(s3Stream)
                archive.append(stream, {
                    name: `${sanitizeTitle(job.title || job.id.slice(0, 5))}.${
                        format.ext
                    }`,
                })
                continue
            }

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
    const s3Key = `requests/${requestId}/${formatId}.zip`
    await uploadFromStream(s3Key, zipStream)
    const urlExpiresAt = new Date(Date.now() + S3_URL_EXPIRES_IN_SECONDS * 1000)
    const url = await createPresignedS3Url(s3Key, S3_URL_EXPIRES_IN_SECONDS)
    await upsertRequestDownloadUrl(requestId, formatId, url, urlExpiresAt)
    return url
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
