import type { InferSelectModel } from 'drizzle-orm'
import { z } from 'zod'
import { formats, jobStatusEnum } from '../../../database/schema'

export const createJobsSchema = z.object({
    requestId: z.string().uuid().nullish(),
    urls: z.array(z.string().url()),
})

export const statusSchema = z.enum(jobStatusEnum.enumValues)
export type JobStatus = z.infer<typeof statusSchema>

export const downloadJobByRequestSchema = z.object({
    requestId: z.string().uuid(),
    formatId: z.string(),
})

export const downloadJobByIdSchema = z.object({
    jobId: z.string().uuid(),
    formatId: z.string(),
})

export const retryJobsSchema = z
    .object({
        ids: z.string().uuid().array().optional(),
        requestId: z.string().uuid().nullish(),
    })
    .refine(
        (val) => (val.ids && !val.requestId) || (!val.ids && val.requestId),
        {
            message: 'Either ids or requestId is required, but not both',
        }
    )

export type RetryJobsSchema = z.infer<typeof retryJobsSchema>
export type CreateJobsSchema = z.infer<typeof createJobsSchema>

export type Format = InferSelectModel<typeof formats>