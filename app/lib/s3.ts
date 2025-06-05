import { GetObjectCommand, S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { PassThrough } from 'stream'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

export default s3

const bucket = process.env.S3_FILES_BUCKET

export async function insertFileToS3(key: string, file: Buffer) {
    try {
        const params = {
            Bucket: bucket,
            Key: key,
            Body: file,
        }
        await s3.putObject(params)
    } catch (error) {
        console.error('Error uploading object to S3:', error)
        throw error
    }
}

export async function createPresignedS3Url(
    key: string,
    expiresInSeconds: number
) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    })

    const url = await getSignedUrl(s3, command, {
        expiresIn: expiresInSeconds,
    })
    return url
}

export async function uploadFromStream(key: string, pass: PassThrough) {
    const upload = new Upload({
        client: s3,
        params: {
            Bucket: bucket,
            Key: key,
            Body: pass,
        },
    })
    return await upload.done()
}

export async function deleteFileFromS3(key: string) {
    try {
        const params = {
            Bucket: bucket,
            Key: key,
        }
        await s3.deleteObject(params)
    } catch (error) {
        console.error('Error deleting object from S3:', error)
        throw error
    }
}

export async function getFileFromS3(key: string) {
    try {
        const params = {
            Bucket: bucket,
            Key: key,
        }
        const data = await s3.getObject(params)
        const fileBytes = await data.Body?.transformToByteArray()
        if (!fileBytes)
            throw new Error('Error getting object from S3: No file bytes found')
        return Buffer.from(fileBytes)
    } catch (error) {
        console.error('Error getting object from S3:', error)
        throw error
    }
}

export async function getS3FileStream(key: string) {
    const params = {
        Bucket: bucket,
        Key: key,
    }
    const data = await s3.getObject(params)
    if (!data)
        throw new Error('Error getting object from S3: No file bytes found')

    const readableStream = data.Body?.transformToWebStream()
    if (!readableStream) {
        throw new Error(
            'Error getting object from S3: No readable stream found'
        )
    }

    const asyncIterableStream = {
        async *[Symbol.asyncIterator]() {
            const reader = readableStream.getReader()
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    yield value
                }
            } finally {
                reader.releaseLock()
            }
        },
    }

    return asyncIterableStream
}
