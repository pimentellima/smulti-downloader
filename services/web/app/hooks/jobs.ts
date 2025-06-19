import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Job } from '@shared/api'
import type {
    CreateJobsSchema,
    RetryJobsSchema,
} from '@validations/schemas/job'

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
        refetchInterval: 2000,
    })
}

export function useCreateJobs() {
    const queryClient = useQueryClient()

    return useMutation<{ requestId: string }, unknown, CreateJobsSchema>({
        mutationFn: async (data: CreateJobsSchema) => {
            const response = await fetch(`/api/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

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

export function useRetryJobs() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: RetryJobsSchema) => {
            const response = await fetch(`/api/retry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
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
            const response = await fetch(`/api/jobs/${jobId}/cancel`, {
                method: 'PUT',
            })
            if (!response.ok) {
                throw new Error('Failed to cancel job')
            }
        },
        onSuccess: async () => {
            await queryClient.refetchQueries({
                queryKey: ['jobs'],
            })
        },
    })
}
