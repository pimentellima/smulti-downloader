import { z } from 'zod'
import { jobStatusEnum } from '~/database/schema'

export const createJobsSchema = z.object({
    requestId: z.string().uuid().nullish(),
    urls: z.array(z.string().url()),
})

export const statusSchema = z.enum(jobStatusEnum.enumValues)
export type JobStatus = z.infer<typeof statusSchema>

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

export type Format = {
    format_id: string
    ext: string
    resolution?: string 
    filesize: number
    tbr: number
    url: string
}

export type JsonData = {
    title: string
    formats_mp4: (Format & { resolution: string })[]
    formats_mp3: Omit<Format, 'resolution'>[]
    thumbnail_url: string
}
