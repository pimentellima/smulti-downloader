'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Job } from '@/lib/db'
import type { Locale } from '@/dictionaries'

export function useJobs(requestId: string | null) {
    return useQuery<Job[]>({
        queryKey: ['jobs', requestId],
        queryFn: async () => {
            const response = await fetch(`/api/jobs?requestId=${requestId}`)
            if (!response.ok) {
                throw new Error('Failed to fetch jobs')
            }
            return await response.json()
        },
        enabled: !!requestId,
        refetchInterval: (query) => {
            // Stop polling if all jobs are complete
            if (!query) return false
            const allComplete = query.state.data?.every(
                (job: Job) => job.status === 'ready' || job.status === 'error'
            )

            return allComplete ? false : 2000
        },
    })
}

export function useProcessLinks() {
    const queryClient = useQueryClient()

    return useMutation<
        { requestId: string },
        unknown,
        {
            urls: string[]
            requestId?: string | null
        }
    >({
        mutationFn: async (data: {
            urls: string[]
            requestId?: string | null
        }) => {
            const response = await fetch(
                `/api/process/${data.requestId || ''}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ urls: data.urls }),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to process links')
            }

            return await response.json()
        },
        onSuccess: async (data) => {
            await queryClient.invalidateQueries({
                queryKey: ['jobs', data.requestId],
            })
        },
    })
}

export function useRetryJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (jobId: string) => {
            const response = await fetch(`/api/retry/${jobId}`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to retry job')
            }

            return await response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['jobs'] })
        },
    })
}

export function useRetryAllJobs() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (requestId: string) => {
            const response = await fetch(`/api/retry/batch/${requestId}`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to retry jobs')
            }

            return await response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['jobs'],
            })
        },
    })
}

export function useCancelJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (jobId: string) => {
            const response = await fetch(`/api/jobs/${jobId}/status/cancel`, {
                method: 'PUT',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to cancel job')
            }

            return await response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['jobs'] })
        },
    })
}

export function useLocale() {
    const locale = 'pt-BR'
    return locale as Locale
}
