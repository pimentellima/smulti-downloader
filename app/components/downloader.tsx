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
import DownloadButton from './download-button'

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
    const { error, data: jobs, isLoading: isLoadingJobs } = useJobs(requestId)
    const canDownloadCount = (jobs || []).filter(
        (job) => job.status === 'ready'
    ).length
    const failedJobsCount = (jobs || []).filter(
        (job) => job.status === 'error'
    ).length

    // Cria uma lista de todos os formatos presentes em todos os jobs (interseção)
    const commonFormats = useMemo(() => {
        const formats = jobs?.map((job) => job.formats || [])
        if (!formats || formats.length === 0) return []

        return formats
            .reduce((acc, list) => {
                const idsInList = new Set(list.map((f) => f.formatId))
                return acc.filter((f) => idsInList.has(f.formatId))
            })
            .map((f) => {
                const { filesize, ...format } = f
                return format
            })
    }, [jobs])

    if (!jobs) return null

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 mt-4">
                <div className="flex items-center justify-center sm:justify-start w-full space-x-1">
                    <FormatSelector
                        disabled={isLoadingJobs || !commonFormats.length}
                        selectedFormat={
                            commonFormats.find(
                                (f) => f.formatId === selectedFormat
                            ) || undefined
                        }
                        onSelect={(format) => {
                            setSelectedFormat(format.formatId)
                        }}
                        formatOptions={commonFormats}
                    />
                    <DownloadButton
                        disabled={
                            isLoadingJobs ||
                            canDownloadCount === 0 ||
                            !selectedFormat
                        }
                        description={`${downloaderDictionary[locale].downloadAll} (${canDownloadCount})`}
                        downloadLink={`${BASE_URL}/api/downloads/batch?formatId=${selectedFormat}&requestId=${requestId}`}
                    />

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
                isLoading={isLoadingJobs}
                onRetry={handleRetry}
                onRemoveJob={handleRemoveJob}
                isRetrying={retryingJobs}
            />
        </div>
    )
}
