import { z } from 'zod'

export const createJobsSchema = z.object({
    requestId: z.string().uuid().nullish(),
    urls: z.array(z.string().url()),
})

export const retryJobsSchema = z
    .object({
        ids: z.string().uuid().array().optional(),
        requestId: z.string().uuid().nullish(),
    })
    .refine((val) => val.ids || val.requestId, {
        message: 'Either ids or requestId is required',
    })

export type RetryJobsSchema = z.infer<typeof retryJobsSchema>
export type CreateJobsSchema = z.infer<typeof createJobsSchema>
