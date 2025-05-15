import { LinksTable } from '@/components/links-table'
import { Button } from '@/components/ui/button'
import { BASE_URL } from '@/lib/base-url'
import {
    useCancelJob,
    useJobs,
    useLocale,
    useRetryAllJobs,
    useRetryJob,
} from '@/lib/hooks'
import { DownloadIcon, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

const downloaderDictionary = {
    'en-US': {
        downloadAll: 'Download All',
        retry: 'Retry',
        retrying: 'Retrying',
    },
    'pt-BR': {
        downloadAll: 'Baixar Todos',
        retry: 'Tentar Novamente',
        retrying: 'Tentando Novamente',
    },
}

export default function Downloader() {
    const locale = useLocale()
    const [searchParams, setSearchParams] = useSearchParams()
    const requestId = searchParams.get('requestId')
    const cancelJob = useCancelJob()
    const retryJob = useRetryJob()
    const retryAllJobs = useRetryAllJobs()
    const [retryingJobs, setRetryingJobs] = useState<Record<string, boolean>>(
        {}
    )

    const setError = (error: string) => {
        setSearchParams((prev) => ({ ...prev, error }))
    }

    const handleRemoveJob = async (jobId: string) => {
        try {
            await cancelJob.mutateAsync(jobId)
        } catch (err) {
            setError('Failed to remove job')
        }
    }

    const handleRetry = async (jobId: string) => {
        try {
            setRetryingJobs((prev) => ({ ...prev, [jobId]: true }))
            await retryJob.mutateAsync(jobId)
        } catch (err) {
            setError('Failed to retry job')
        } finally {
            setRetryingJobs((prev) => ({ ...prev, [jobId]: false }))
        }
    }
    const handleRetryAll = async () => {
        if (!requestId) return

        try {
            await retryAllJobs.mutateAsync(requestId)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to retry jobs'
            )
        }
    }
    const { data: jobs, isLoading } = useJobs(requestId)

    const canDownloadCount = (jobs || []).filter(
        (job) => job.status === 'ready'
    ).length
    const failedJobsCount = (jobs || []).filter(
        (job) => job.status === 'error'
    ).length

    if (!jobs) return null

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 mt-4">
                <div className="flex items-center justify-center sm:justify-start w-full space-x-1">
                    {canDownloadCount > 0 && (
                        <Button asChild size="lg" variant="default">
                            <a
                                download
                                href={`${BASE_URL}/api/processed-audios/batch/${requestId}`}
                            >
                                <DownloadIcon className="mr-2 h-3 w-3" />
                                {`${downloaderDictionary[locale].downloadAll} (${canDownloadCount})`}
                            </a>
                        </Button>
                    )}
                    {failedJobsCount > 0 && (
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleRetryAll}
                            disabled={retryAllJobs.isPending}
                        >
                            {retryAllJobs.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    {downloaderDictionary[locale].retrying}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-3 w-3" />
                                    {`${downloaderDictionary[locale].retry} (${failedJobsCount})`}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
            <LinksTable
                data={jobs || []}
                isLoading={isLoading}
                onRetry={handleRetry}
                onRemoveJob={handleRemoveJob}
                isRetrying={retryingJobs}
            />
        </div>
    )
}
