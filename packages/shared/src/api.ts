import { db, type DatabaseType } from '@drizzle/client'
import * as schema from '@drizzle/schema'
import { ApiError } from '@shared/errors'
import type { JobStatus, ConvertFormatStatus } from '@validations/schemas/job'
import 'dotenv/config'
import {
    and,
    eq,
    inArray,
    isNotNull,
    not,
    or,
    sql,
    type InferInsertModel,
    type InferSelectModel,
} from 'drizzle-orm'

export type Job = InferSelectModel<typeof schema.jobs> & {
    formats: InferSelectModel<typeof schema.formats>[]
    mergedFormats: InferSelectModel<typeof schema.mergedFormats>[]
}

export async function getJob(id: string): Promise<Job> {
    const job = await db.query.jobs.findFirst({
        where: eq(schema.jobs.id, id),
        with: {
            formats: true,
            mergedFormats: true,
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

export async function isJobInQueue(jobId: string) {
    const [job] = await db
        .select({
            isJobInQueue: sql<boolean>`COUNT(*) > 0`,
        })
        .from(schema.jobs)
        .leftJoin(
            schema.mergedFormats,
            eq(schema.jobs.id, schema.mergedFormats.jobId),
        )
        .where(
            and(
                eq(schema.jobs.id, jobId),
                or(
                    eq(schema.jobs.status, 'processing'),
                    eq(schema.jobs.status, 'queued-processing'),
                    and(
                        isNotNull(schema.mergedFormats.status),
                        or(
                            eq(schema.mergedFormats.status, 'converting'),
                            eq(
                                schema.mergedFormats.status,
                                'queued-converting',
                            ),
                        ),
                    ),
                ),
            ),
        )

    return job?.isJobInQueue || false
}

export async function getJobsByRequestId(requestId: string): Promise<Job[]> {
    return await db.query.jobs.findMany({
        with: {
            formats: true,
            mergedFormats: true,
        },
        where: and(
            eq(schema.jobs.requestId, requestId),
            not(eq(schema.jobs.status, 'cancelled')),
        ),
    })
}

export async function getRequestById(requestId: string) {
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
    const [request] = await db.insert(schema.requests).values({}).returning()

    return request
}

export async function createJobs(
    jobs: InferInsertModel<typeof schema.jobs>[],
    tx?: DatabaseType,
) {
    const database = tx || db

    return await database.insert(schema.jobs).values(jobs).returning()
}

export async function retryJobsByRequestId(requestId: string) {
    const jobs = await db
        .update(schema.jobs)
        .set({ status: 'waiting-to-process' })
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
    const [job] = await db
        .update(schema.jobs)
        .set({ status: 'waiting-to-process' })
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

export const updateMergedFormatStatus = async (
    id: string,
    status: ConvertFormatStatus,
    tx?: DatabaseType,
) => {
    const database = tx || db

    const mergedFormat = await database
        .update(schema.mergedFormats)
        .set({ status })
        .where(eq(schema.mergedFormats.id, id))
        .returning()

    if (!mergedFormat) {
        throw new ApiError({
            code: 'not_found',
            message: `MergedFormat not found`,
        })
    }

    return mergedFormat
}

export const updateJobStatus = async (
    id: string,
    status: JobStatus,
    tx?: DatabaseType,
) => {
    const database = tx || db

    const job = await database
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

export const batchUpdateJobStatus = async (
    ids: string[],
    status: JobStatus,
    tx?: DatabaseType,
) => {
    if (ids.length === 0) return []

    const database = tx || db

    const jobs = await database
        .update(schema.jobs)
        .set({ status })
        .where(inArray(schema.jobs.id, ids))
        .returning()

    if (jobs.length !== ids.length) {
        const foundIds = new Set(jobs.map((j) => j.id))
        const missing = ids.filter((id) => !foundIds.has(id))
        throw new ApiError({
            code: 'not_found',
            message: `Some job IDs were not found: ${missing.join(', ')}`,
        })
    }

    return jobs
}

export async function upsertMergedFormat(
    jobId: string,
    status: ConvertFormatStatus,
    audioFormatId: string,
    videoFormatId: string,
) {
    const [mergedFormat] = await db
        .insert(schema.mergedFormats)
        .values({
            jobId,
            status,
            audioFormatId,
            videoFormatId,
        })
        .returning()
        .onConflictDoNothing()

    return mergedFormat
}

export async function getMergedFormatById(id: string) {
    const format = await db.query.mergedFormats.findFirst({
        where: eq(schema.mergedFormats.id, id),
        with: {
            audioFormat: true,
            videoFormat: true,
            job: {
                columns: {
                    title: true,
                    id: true,
                },
            },
        },
    })
    if (!format) {
        throw new ApiError({
            code: 'not_found',
            message: `MergedFormat ID ${id} not found`,
        })
    }
    return format
}

export async function setMergedFormatDownloadUrl(
    id: string,
    downloadUrl: string,
) {
    const [link] = await db
        .update(schema.mergedFormats)
        .set({ downloadUrl })
        .where(eq(schema.mergedFormats.id, id))
        .returning()

    if (!link) {
        throw new ApiError({
            code: 'not_found',
            message: `MergedFormat ID ${id} not found`,
        })
    }

    return link
}

export async function getMergedVideoByFormatId(videoFormatId: string) {
    const format = await db.query.formats.findFirst({
        where: eq(schema.formats.id, videoFormatId),
    })
    if (!format) {
        throw new ApiError({
            code: 'not_found',
            message: `Format with id ${videoFormatId} not found`,
        })
    }
    const link = await db.query.mergedFormats.findFirst({
        where: and(eq(schema.mergedFormats.videoFormatId, format.id)),
    })
    return link
}

export async function getItemsInQueueCount() {
    const [count] = await db
        .select({
            count: sql<number>`COUNT(*)`,
        })
        .from(schema.jobs)
        .leftJoin(
            schema.mergedFormats,
            eq(schema.jobs.id, schema.mergedFormats.jobId),
        )
        .where(
            or(
                eq(schema.jobs.status, 'processing'),
                eq(schema.jobs.status, 'queued-processing'),
                and(
                    isNotNull(schema.mergedFormats.status),
                    or(
                        eq(schema.mergedFormats.status, 'converting'),
                        eq(schema.mergedFormats.status, 'queued-converting'),
                    ),
                ),
            ),
        )

    return count?.count || 0
}

export async function findNextJobToEnqueue() {
    const [job] = await db
        .select({
            jobId: schema.jobs.id,
            jobStatus: schema.jobs.status,
            mergedFormatId: schema.mergedFormats.id,
            mergedFormatStatus: schema.mergedFormats.status,
        })
        .from(schema.jobs)
        .leftJoin(
            schema.mergedFormats,
            eq(schema.jobs.id, schema.mergedFormats.jobId),
        )
        .where(
            or(
                eq(schema.jobs.status, 'waiting-to-process'),
                and(
                    isNotNull(schema.mergedFormats.status),
                    eq(schema.mergedFormats.status, 'waiting-to-convert'),
                ),
            ),
        )
    return job
}

export async function getFormatById(formatId: string) {
    const format = await db.query.formats.findFirst({
        where: eq(schema.formats.id, formatId),
    })

    if (!format) {
        throw new ApiError({
            code: 'not_found',
            message: `Format with id ${formatId} not found`,
        })
    }

    return format
}
