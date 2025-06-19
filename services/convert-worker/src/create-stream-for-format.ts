import { spawn } from 'child_process'
import { Readable } from 'stream'
import { sanitizeTitle } from '@smulti-downloader/utils/src/utils'
import type { Job } from '@shared/api'
import type { Format } from '@validations/schemas/job'
import { ApiError } from '@shared/errors'

export async function createStreamForFormat(
    job: Job & { formats: Format[] },
    formatId: string,
) {
    const format = job.formats.find((f) => f.id === formatId)
    if (!format) {
        throw new ApiError({
            code: 'bad_request',
            message: `Format with id ${formatId} not found`,
        })
    }
    if (format.acodec === 'none' && format.vcodec === 'none') {
        throw new ApiError({
            code: 'bad_request',
            message: 'Format has no audio or video codec',
        })
    }
    const sanitizedTitle = sanitizeTitle(job.title || job.id.slice(0, 5))

    // video only
    if (format.vcodec !== 'none' && format.acodec === 'none') {
        const audioFormats = job.formats.filter(
            (f) => f.acodec !== 'none' && f.vcodec === 'none',
        )
        const filteredSortedAudioFormats = audioFormats.sort((a, b) => {
            if (
                a.formatNote?.includes('original') &&
                !b.formatNote?.includes('original')
            )
                return -1
            if (
                format.formatNote?.includes('original') &&
                !a.formatNote?.includes('original')
            )
                return 1
            if (format.ext === 'mp4' && a.ext === 'm4a' && b.ext !== 'm4a')
                return -1
            if (format.ext === 'mp4' && b.ext === 'm4a' && a.ext !== 'm4a')
                return 1
            if (format.ext === 'webm' && a.ext === 'webm' && b.ext !== 'webm')
                return -1
            if (format.ext === 'webm' && b.ext === 'webm' && a.ext !== 'webm')
                return 1
            return (a.filesize || 0) - (b.filesize || 0)
        })
        const videoResponse = await fetch(format.url)
        const audioResponse = await fetch(filteredSortedAudioFormats[0]?.url!)
        if (!videoResponse.ok || !audioResponse.ok) {
            throw new ApiError({
                code: 'internal_server_error',
                message: 'Could not fetch video or audio response',
            })
        }
        const videoStream = Readable.fromWeb(
            // @ts-ignore: TypeScript may complain, but this works in Node.js >=18
            videoResponse.body as globalThis.ReadableStream,
        )
        const audioStream = Readable.fromWeb(
            // @ts-ignore: TypeScript may complain, but this works in Node.js >=18
            audioResponse.body as globalThis.ReadableStream,
        )

        const stream = combineAudioVideoStreams(audioStream, videoStream)
        return {
            title: sanitizedTitle,
            stream,
            ext: format.ext,
        }
    }

    const response = await fetch(format.url)
    if (!response.ok) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Could not fetch response',
        })
    }
    return {
        title: sanitizedTitle,
        stream: Readable.fromWeb(
            // @ts-ignore: TypeScript may complain, but this works in Node.js >=18
            response.body as globalThis.ReadableStream,
        ),
        ext: format.ext,
    }
}

function combineAudioVideoStreams(
    audioStream: Readable,
    videoStream: Readable,
) {
    const ffmpegPath = '/usr/bin/ffmpeg'
    let ffmpegProcess = spawn(
        ffmpegPath,
        [
            '-loglevel',
            '8',
            '-hide_banner',
            '-i',
            'pipe:3',
            '-i',
            'pipe:4',
            '-map',
            '0:a',
            '-map',
            '1:v',
            '-c',
            'copy',
            '-f',
            'matroska',
            'pipe:1',
        ],
        {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'inherit', 'pipe', 'pipe'],
        },
    )
    audioStream.pipe(ffmpegProcess.stdio[3] as NodeJS.WritableStream)
    videoStream.pipe(ffmpegProcess.stdio[4] as NodeJS.WritableStream)
    if (!ffmpegProcess.stdout) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Could not create ffmpeg process',
        })
    }
    return ffmpegProcess.stdout
}
