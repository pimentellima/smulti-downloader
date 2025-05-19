import { ApiError } from '@/api/errors'
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
/*     endpoint:
        process.env.NODE_ENV === 'development'
            ? 'http://localhost:4566'
            : undefined, */
})

const sqsQueueName = process.env.SQS_QUEUE_NAME!

export async function addJobToSqsQueue(jobId: string) {
    try {
        console.log({ sqsQueueName })
        const { QueueUrl } = await client.send(
            new GetQueueUrlCommand({
                QueueName: sqsQueueName,
            })
        )
        console.log({ QueueUrl })

        const command = new SendMessageCommand({
            QueueUrl,
            MessageBody: jobId,
        })
        return await client.send(command)
    } catch (error) {
        console.log(error)
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Error sending message to SQS',
        })
    }
}
