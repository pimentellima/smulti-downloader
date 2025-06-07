import { getJobOrThrow, insertDownloadLink, updateJobStatus } from '@/lib/api'
import { createStreamForFormat } from '@/lib/create-stream-for-format'
import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { DatabaseContext } from 'database/context'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../database/schema'
import { uploadFromStream } from '@/lib/s3'
import { PassThrough } from 'stream'

export const handler: SQSHandler = async (event: SQSEvent) => {
    const client = postgres(process.env.DATABASE_URL!)
    const db = drizzle(client, { schema })

    return DatabaseContext.run(db, async () => {
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
                    formatId
                )
                const pass = new PassThrough()
                stream.pipe(pass)
                const key = `${title}.${ext}`
                await uploadFromStream(key, pass)
                console.log('Arquivo enviado para o S3:', key)
                const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`
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
    })
}
