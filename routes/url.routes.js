import express from 'express'
import { shortenpostRequestSchema } from '../validation/request.validation.js';
import {db} from '../db/index.js';
import {urlsTable} from '../models/index.js'
import { nanoid } from 'nanoid';
import { ensureAuthenticated } from '../middlewares/auth.middleware.js';
import { createShortUrl, updateShortUrl } from '../services/url.service.js';
import { eq, and} from 'drizzle-orm';
import { hashPasswordWithSalt } from '../utils/hash.js';
import bcrypt from 'bcryptjs';
const router = express.Router();

router.get('/codes', ensureAuthenticated, async function (req, res) {
  const codes = await db
    .select()
    .from(urlsTable)
    .where(eq(urlsTable.userId, req.user.id));

  return res.json({ codes });
});

router.delete('/:id', ensureAuthenticated, async function (req, res) {
  const id = req.params.id;
  await db
    .delete(urlsTable)
    .where(and(eq(urlsTable.id, id), eq(urlsTable.userId, req.user.id)));

  return res.status(200).json({ deleted: true });
});

router.get('/:shortcode', async (req, res) => {
    const shortcode = req.params.shortcode;

    const [result] = await db.select({
        target: urlsTable.target,
    }).from(urlsTable).where(eq(urlsTable.shortcode, shortcode));

    if(!result){
        return res.status(404).json({error: 'Shortcode not found'});
    }

    return res.redirect(result.target);
})

router.post('/shorten', ensureAuthenticated, async(req, res) => {
    let  {url, code} = req.body;

    if(url && !url.startsWith('http://') && !url.startsWith('https://')){
        url=`http://${url}`;
    }

    const validationResult = await shortenpostRequestSchema.safeParseAsync({url, code});

    if(validationResult.error){
        return res.status(400).json({error: validationResult.error});
    }

    const validatedData = validationResult.data;
    const shortcode = validatedData.code ?? nanoid(8);

    const result = await createShortUrl({
        shortcode,
        target: validatedData.url,
        userId: req.user.id,
    });

    return res.status(201).json(result);
})

router.patch('/:id', ensureAuthenticated, async(req, res) => {
    const { expiresAt, collectionLinks, isCollection, password, description } = req.body;
    const updates = {};
    if(description !== undefined) updates.description = description || null;
    if (expiresAt       !== undefined) updates.expiresAt       = expiresAt ? new Date(expiresAt) : null;
    if (collectionLinks !== undefined) updates.collectionLinks = collectionLinks;
    if (isCollection    !== undefined) updates.isCollection    = isCollection;
    if(password !== undefined) updates.password = password? bcrypt.hash(password,12) : null;

    const result = await updateShortUrl(req.params.id, req.user.id, updates);

    if(!result){
        return res.status(404).json({error: 'Shortcode not found or you do not have permission to update it'});
    }

    return res.json({url:result});
})



export default router;