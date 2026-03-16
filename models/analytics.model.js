import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { urlsTable } from "./url.model.js";

export const analyticsTable = pgTable('analytics', {
    id: uuid('id').primaryKey().defaultRandom(),
    urlId: uuid('url_id').references(() => urlsTable.id).notNull(),

    device: varchar('device', {length:50}),
    os: varchar('os', {length:50}),
    browser: varchar('browser', {length:50}),
    country: varchar('country', {length:50}),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
})