import { Job } from '@shared/api'

export function isJobConverting(job: Job) {
    return job.mergedFormats?.some(
        (format) =>
            format.status === 'converting' ||
            format.status === 'waiting-to-convert' ||
            format.status === 'queued-converting',
    )
}

export function isJobProcessing(job: Job) {
    return (
        job.status === 'processing' ||
        job.status === 'waiting-to-process' ||
        job.status === 'queued-processing'
    )
}

export function isJobConvertingError(job: Job) {
    return job.mergedFormats?.some(
        (format) => format.status === 'error-converting',
    )
}
