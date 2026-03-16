import {pgTable, uuid, varchar, text, timestamp, jsonb, boolean} from 'drizzle-orm/pg-core'
import { usersTable } from './user.model.js'
import { create } from 'node:domain'

export const urlsTable = pgTable('urls', {
    id: uuid('id').primaryKey().defaultRandom(),

    shortcode: varchar('code', {length:155}).notNull().unique(),
    target: text('target_url').notNull(),

    description: varchar('description', {length:255}),

    password: text('password'),

    expiresAt: timestamp('expires_at'),

    isCollection: boolean('is_collection').default(false).notNull(),
    collectionLinks: jsonb('collection_links').default([]),

    userId: uuid('user_id').references(()=> usersTable.id).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});