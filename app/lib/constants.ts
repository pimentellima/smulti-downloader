export const BASE_URL = 'http://localhost:3000'

// variavéis de dev e docker do docker-compose.yml
export const dbUrl =
    process.env.NODE_ENV === 'development'
        ? 'postgres://postgres:postgres@localhost:5328/my-local-db'
        : process.env.DATABASE_URL

export const sqsQueueName =
    process.env.NODE_ENV === 'development'
        ? 'JobsQueue'
        : process.env.SQS_QUEUE_NAME
