import { updateJobStatus } from '@/lib/api/jobs'
import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { DatabaseContext } from '../../database/context'
import * as schema from '../../database/schema'

export const main: SQSHandler = async (event: SQSEvent) => {
    const client = postgres(process.env.DATABASE_URL!)
    const db = drizzle(client, { schema })

    return DatabaseContext.run(db, async () => {
        for (const record of event.Records) {
            try {
                console.log('Mensagem recebida:', record.body)
                await updateJobStatus(record.body, 'processing', db)
            } catch (err) {
                console.error('Erro ao processar mensagem:', err)
            }
        }
    })
}
