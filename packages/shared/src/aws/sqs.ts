import { ApiError } from '@shared/errors'
import {
    GetQueueUrlCommand,
    SQSClient,
    SendMessageCommand,
} from '@aws-sdk/client-sqs'

const client = new SQSClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

const sqsProcessQueueName = process.env.SQS_PROCESS_QUEUE_NAME!

export async function addJobToSqsQueue(jobId: string) {
    try {
        const { QueueUrl } = await client.send(
            new GetQueueUrlCommand({
                QueueName: sqsProcessQueueName,
            }),
        )

        const command = new SendMessageCommand({
            QueueUrl,
            MessageBody: jobId,
        })
        return await client.send(command)
    } catch (error) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Error sending message to SQS',
        })
    }
}
