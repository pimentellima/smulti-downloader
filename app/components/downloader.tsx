import { LinksTable } from '@/components/links-table'
import { Button } from '@/components/ui/button'
import { BASE_URL } from '@/lib/constants'
import { useCancelJob, useJobs, useRetryJobs } from '@/hooks/jobs'
import { DownloadIcon, Loader2, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLocale } from '@/hooks/locale'
import FormatSelector from './format-selector'
import type { Format } from '@/lib/schemas/job'

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

interface DownloaderProps {
    setPageError: (error: string | undefined) => void
}

export default function Downloader({ setPageError }: DownloaderProps) {
    const locale = useLocale()
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
    const requestId = searchParams.get('requestId')
    const cancelJob = useCancelJob()
    const retryJobs = useRetryJobs()
    const [retryingJobs, setRetryingJobs] = useState<Record<string, boolean>>(
        {}
    )

    const handleRemoveJob = async (jobId: string) => {
        try {
            await cancelJob.mutateAsync(jobId)
        } catch (err) {
            setPageError('Failed to remove job')
        }
    }

    const handleRetry = async (jobId: string) => {
        try {
            setRetryingJobs((prev) => ({ ...prev, [jobId]: true }))
            await retryJobs.mutateAsync({ ids: [jobId] })
        } catch (err) {
            setPageError('Failed to retry job')
        } finally {
            setRetryingJobs((prev) => ({ ...prev, [jobId]: false }))
        }
    }
    const handleRetryAll = async () => {
        if (!requestId) return

        try {
            await retryJobs.mutateAsync({ requestId })
        } catch (err) {
            setPageError(
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

    // Cria uma lista de todos os formatos presentes em todos os jobs (interseção)
    const commonFormats = useMemo(() => {
        const formats = jobs.map((job) => [
            ...(job.json?.formats_audio || []),
            ...(job.json?.formats_video || []),
        ])
        if (formats.length === 0) return []

        return formats
            .reduce((acc, list) => {
                const idsInList = new Set(list.map((f) => f.format_id))
                return acc.filter((f) => idsInList.has(f.format_id))
            })
            .map((f) => {
                const { filesize, ...format } = f
                return format
            })
    }, [jobs])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 mt-4">
                <div className="flex items-center justify-center sm:justify-start w-full space-x-1">
                    <FormatSelector
                        disabled={isLoading || !commonFormats.length}
                        selectedFormat={
                            commonFormats.find(
                                (f) => f.format_id === selectedFormat
                            ) || undefined
                        }
                        onSelect={(format) => {
                            setSelectedFormat(format.format_id)
                        }}
                        formatOptions={commonFormats}
                    />
                    {canDownloadCount > 0 && selectedFormat ? (
                        <Button asChild size="lg" variant="default">
                            <a
                                download
                                href={`${BASE_URL}/api/jobs/download/batch?formatId=${selectedFormat}&requestId=${requestId}`}
                            >
                                <DownloadIcon className="mr-2 h-3 w-3" />
                                {`${downloaderDictionary[locale].downloadAll} (${canDownloadCount})`}
                            </a>
                        </Button>
                    ) : (
                        <Button disabled size="lg" variant="default">
                            <DownloadIcon className="mr-2 h-3 w-3" />
                            {`${downloaderDictionary[locale].downloadAll} (${canDownloadCount})`}
                        </Button>
                    )}
                    {failedJobsCount > 0 && (
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleRetryAll}
                            disabled={retryJobs.isPending}
                        >
                            {retryJobs.isPending ? (
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
