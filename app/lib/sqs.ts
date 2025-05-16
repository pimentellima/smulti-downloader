import { ApiError } from '@/api/errors'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const client = new SQSClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

const queueUrl = process.env.SQS_QUEUE_URL

export async function sendMessageToSqs(messageBody: string) {
    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
    })

    try {
        return await client.send(command)
    } catch (error) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Error sending message to SQS',
        })
    }
}
