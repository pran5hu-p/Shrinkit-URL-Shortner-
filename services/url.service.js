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