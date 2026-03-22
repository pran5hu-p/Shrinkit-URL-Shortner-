import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { urlsTable } from "../models/index.js";


export async function createShortUrl({
  shortcode,
  target,
  userId,
  description     = null,
  password        = null,
  expiresAt       = null,
  isCollection    = false,
  collectionLinks = [],
}) {
  const [result] = await db
    .insert(urlsTable)
    .values({
      shortcode,
      target,
      userId,
      description,
      password,
      expiresAt,
      isCollection,
      collectionLinks,
    })
    .returning({
      id:              urlsTable.id,
      shortcode:       urlsTable.shortcode,
      target:          urlsTable.target,
      description:     urlsTable.description,
      isCollection:    urlsTable.isCollection,
      collectionLinks: urlsTable.collectionLinks,
      expiresAt:       urlsTable.expiresAt,
      createdAt:       urlsTable.createdAt,
    });

  return result;
}

export async function updateShortUrl(id, userId, updates) {
    const [result] = await db.update(urlsTable).set(updates)
    .where(and(eq(urlsTable.id, id), eq(urlsTable.userId, userId))).returning();

    return result;
}