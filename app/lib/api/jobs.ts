import { ApiError } from '@/api/errors'
import {
    and,
    eq,
    not,
    inArray,
    type InferInsertModel,
    type InferSelectModel,
} from 'drizzle-orm'
import { database } from '~/database/context'
import * as schema from '~/database/schema'

export type Job = InferSelectModel<typeof schema.jobs>

export async function getJob(id: string) {
    const db = database()
    const job = await db.query.jobs.findFirst({
        where: eq(schema.jobs.id, id),
    })

    if (!job) {
        throw new ApiError({
            code: 'not_found',
            message: `Job not found`,
        })
    }

    return job
}

export async function getJobsByRequestId(requestId: string, opts: any) {
    const db = database()

    return await db.query.jobs.findMany({
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
