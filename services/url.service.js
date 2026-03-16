import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { urlsTable } from "../models/index.js";


export async function createShortUrl ({shortcode, target, userId}){
    const [result] = await db.insert(urlsTable).values({
        shortcode: shortcode,
        target: target,
        userId: userId,
    }).returning({
        id: urlsTable.id,
        shortcode:urlsTable.shortcode,
        target: urlsTable.target,
        });
    return result;
}

export async function updateShortUrl(id, userId, updates) {
    const [result] = await db.update(urlsTable).set(updates)
    .where(and(eq(urlsTable.id, id), eq(urlsTable.userId, userId))).returning();

    return result;
}