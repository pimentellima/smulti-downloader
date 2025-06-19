import { getJobOrThrow, insertDownloadLink, updateJobStatus } from '@shared/api'
import { createStreamForFormat } from 'services/convert-worker/src/create-stream-for-format'
import { uploadFromStream } from '@shared/aws/s3'
import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { PassThrough } from 'stream'

export const handler: SQSHandler = async (event: SQSEvent) => {
    for (const record of event.Records) {
        const { jobId, formatId } = JSON.parse(record.body) as {
            jobId: string
            formatId: string
        }
        try {
            console.log('Mensagem recebida:', record.body)
            const { jobId, formatId } = JSON.parse(record.body) as {
                jobId: string
                formatId: string
            }
            await updateJobStatus(jobId, 'converting')
            const job = await getJobOrThrow(jobId)
            const { ext, stream, title } = await createStreamForFormat(
                job,
                formatId,
            )
            const pass = new PassThrough()
            stream.pipe(pass)
            const key = `${title}.${ext}`
            await uploadFromStream(key, pass)
            console.log('Arquivo enviado para o S3:', key)
            const s3Url = `https://${process.env.S3_FILES_BUCKET}.s3.amazonaws.com/${key}`
            await insertDownloadLink(jobId, formatId, s3Url)
            await updateJobStatus(jobId, 'ready')
        } catch (err) {
            try {
                await updateJobStatus(jobId, 'error')
            } catch (e) {
                console.error('Erro ao atualizar status do job:', e)
            }
            console.error('Erro ao processar mensagem:', err)
        }
    }
}
