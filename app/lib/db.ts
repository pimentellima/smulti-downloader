export interface Job {
    id: string
    url: string
    requestId: string
    status: 'queued' | 'processing' | 'error' | 'ready' | 'cancelled'
    title?: string
    format?: 'audio' | 'video'
    outputFileKey?: string
    mediaSourceUrl?: string
}

export const JOBS_TABLE = process.env.DYNAMODB_JOBS_TABLE!

export async function getJob(id: string) {}

export async function getJobsByRequestId(args: any, opts: any) {}

export async function getJobs(ids: string[]) {}

export async function createJob(job: Job) {}

export async function batchCreateJobs(jobs: Job[]) {}

export async function updateJob(id: string, data: Partial<Omit<Job, 'id'>>) {}
