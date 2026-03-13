import {pgTable, uuid, varchar, text, timestamp} from 'drizzle-orm/pg-core'
import { usersTable } from './user.model.js'
import { create } from 'node:domain'

export const urlsTable = pgTable('urls', {
    id: uuid('id').primaryKey().defaultRandom(),

    shortcode: varchar('code', {length:155}).notNull().unique(),
    target: text('target_url').notNull(),

    userId: uuid('user_id').references(()=> usersTable.id).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});