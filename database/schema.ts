import type { JsonData } from '@/lib/schemas/job'
import {
    json,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from 'drizzle-orm/pg-core'

export const jobStatusEnum = pgEnum('job_status', [
    'queued',
    'processing',
    'error',
    'ready',
    'cancelled',
])

export const jobs = pgTable('jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
        .references(() => requests.id, { onDelete: 'cascade' })
        .notNull(),
    url: text('url').notNull(),
    json: jsonb('json').$type<JsonData>(),
    status: jobStatusEnum('status').notNull().default('queued'),
    title: text('title'),
})

export const requests = pgTable('requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    password: text('password').notNull(),
    image: text('image'),
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    createdAt: timestamp('created_at').defaultNow(),
})
