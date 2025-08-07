import {
    findNextJobToEnqueue,
    getMergedFormatById,
    updateJobStatus,
    updateMergedFormatStatus,
} from '@shared/api'
import { uploadFromStream } from '@shared/aws/s3'
import { addConversionToMediaConvert } from '@shared/aws/media-convert'
import {
    addJobsToProcessQueue,
    addMergedFormatToConvertQueue,
} from '@shared/aws/sqs'
import { ApiError } from '@shared/errors'
import { sanitizeTitle } from '@utils/utils'
import { SQSHandler } from 'aws-lambda'
import { PassThrough, Readable } from 'stream'

export const handler: SQSHandler = async (event) => {
    console.log('=== FULL DEBUG ===')

    // 1. Todas as variáveis de ambiente
    console.log('Todas ENV vars:', JSON.stringify(process.env, null, 2))
    for (const record of event.Records) {
        const mergedFormatId = record.body
        const { audioFormat, videoFormat, job } =
            await getMergedFormatById(mergedFormatId)

        await updateMergedFormatStatus(mergedFormatId, 'converting')
        console.log('worker:', process.env.AWS_ACCESS_KEY_ID)

        try {
            const videoResponse = await fetch(videoFormat.url)
            const audioResponse = await fetch(audioFormat.url)
            if (!videoResponse.ok || !audioResponse.ok) {
                console.log(videoResponse, audioResponse)
                throw new ApiError({
                    code: 'internal_server_error',
                    message: 'Could not fetch video or audio response',
                })
            }
            const videoStream = Readable.fromWeb(
                // @ts-ignore: this works in Node.js >=18
                videoResponse.body as globalThis.ReadableStream,
            )
            const audioStream = Readable.fromWeb(
                // @ts-ignore: this works in Node.js >=18
                audioResponse.body as globalThis.ReadableStream,
            )

            const sanitizedTitle = sanitizeTitle(
                job.title || job.id.slice(0, 5),
            )
            const videoKey = `${job.id}/input/${sanitizedTitle}.${videoFormat.ext}`
            const audioKey = `${job.id}/input/${sanitizedTitle}.${audioFormat.ext}`
            const videoPass = new PassThrough()
            const audioPass = new PassThrough()
            videoStream.pipe(videoPass)
            audioStream.pipe(audioPass)
            await uploadFromStream(videoKey, videoPass)
            await uploadFromStream(audioKey, audioPass)

            await addConversionToMediaConvert(mergedFormatId, {
                audioInput: audioKey,
                videoInput: videoKey,
                output: `${job.id}/output/${sanitizedTitle}.mp4`,
            })
        } catch (err) {
            try {
                await updateMergedFormatStatus(job.id, 'error-converting')
            } catch (e) {
                console.error('Erro ao atualizar status do job:', e)
            }

            console.error('Erro ao processar mensagem:', err)
            throw err
        } finally {
            const nextJobToEnqueue = await findNextJobToEnqueue()
            if (nextJobToEnqueue) {
                try {
                    if (nextJobToEnqueue.jobStatus === 'waiting-to-process') {
                        await updateJobStatus(
                            nextJobToEnqueue.jobId,
                            'queued-processing',
                        )
                        await addJobsToProcessQueue([nextJobToEnqueue.jobId])
                    }
                    if (
                        nextJobToEnqueue.mergedFormatStatus ===
                        'waiting-to-convert'
                    ) {
                        await updateMergedFormatStatus(
                            nextJobToEnqueue.mergedFormatStatus,
                            'queued-converting',
                        )
                        await addMergedFormatToConvertQueue(
                            nextJobToEnqueue.mergedFormatId!,
                        )
                    }
                } catch (e) {
                    console.error('Erro ao adicionar próximo job na fila:', e)
                }
            }
        }
    }
}
