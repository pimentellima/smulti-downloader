import { ApiError } from '@shared/errors'
import {
    GetQueueUrlCommand,
    SQSClient,
    SendMessageBatchCommand,
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
const sqsConvertQueueName = process.env.SQS_CONVERT_QUEUE_NAME!

export async function addJobsToProcessQueue(jobIds: string[]) {
    try {
        const { QueueUrl } = await client.send(
            new GetQueueUrlCommand({
                QueueName: sqsProcessQueueName,
            }),
        )

        return await client.send(
            new SendMessageBatchCommand({
                QueueUrl,
                Entries: jobIds.map((id) => ({
                    MessageBody: id,
                    Id: id,
                })),
            }),
        )
    } catch (error) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Error sending messages to SQS Process Queue',
        })
    }
}

export async function addMergedFormatToConvertQueue(mergedFormatId: string) {
    try {
        const { QueueUrl } = await client.send(
            new GetQueueUrlCommand({
                QueueName: sqsConvertQueueName,
            }),
        )

        const command = new SendMessageCommand({
            QueueUrl,
            MessageBody: mergedFormatId,
        })
        return await client.send(command)
    } catch (error) {
        throw new ApiError({
            code: 'internal_server_error',
            message: 'Error sending message to SQS Convert Queue',
        })
    }
}
