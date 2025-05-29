import { relations } from 'drizzle-orm'
import {
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    unique,
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
    status: jobStatusEnum('status').notNull().default('queued'),
    title: text('title'),
})

export const formats = pgTable('formats', {
    id: uuid('id').primaryKey().defaultRandom(),
    formatId: text('format_id').notNull(),
    jobId: uuid('job_id')
        .references(() => jobs.id, { onDelete: 'cascade' })
        .notNull(),
    ext: text('ext').notNull(),
    resolution: text('resolution'),
    acodec: text('acodec'),
    vcodec: text('vcodec'),
    filesize: integer('filesize'),
    tbr: text('tbr'),
    url: text('url').notNull(),
    downloadUrl: text('download_url'),
    downloadUrlExpiresAt: timestamp('download_url_expires_at'),
    language: text('language'),
    formatNote: text('format_note'),
    createdAt: timestamp('created_at').defaultNow(),
})

export const requestDownloadUrl = pgTable('request_download_urls', {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
        .references(() => requests.id, { onDelete: 'cascade' })
        .notNull(),
    formatId: text('format_id').notNull(),
    downloadUrl: text('download_url').notNull(),
    downloadUrlExpiresAt: timestamp('download_url_expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    uniqueRequestFormat: unique().on(table.requestId, table.formatId),
}))

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

export const jobRelations = relations(jobs, ({ many }) => ({
    formats: many(formats),
}))

export const formatRelations = relations(formats, ({ one }) => ({
    job: one(jobs, {
        fields: [formats.jobId],
        references: [jobs.id],
    }),
}))
