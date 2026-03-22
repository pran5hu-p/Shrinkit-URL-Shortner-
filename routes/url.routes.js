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
import { getAnalyticsForUrl, getAnalyticsForUrls, logclick } from '../services/analytics.service.js';
import { log } from 'console';
import { link } from 'fs';
const router = express.Router();

router.get('/codes', ensureAuthenticated, async function (req, res) {
  const codes = await db
    .select()
    .from(urlsTable)
    .where(eq(urlsTable.userId, req.user.id));

  return res.json({ codes });
});

router.get('/analytics', ensureAuthenticated, async(req, res) => {
    const urls = await db.select({id: urlsTable.id, shortcode: urlsTable.shortcode}).from(urlsTable).where(eq(urlsTable.userId, req.user.id));

    const urlIds = urls. map((u => u.id));
    const stats = getAnalyticsForUrls(urlIds);

    return res.json({analytics: stats, urls});
})

router.get('/analytics/:id', ensureAuthenticated, async(req, res) => {
    const [url] = await db.select({id:urlsTable.id, shortcode: urlsTable.shortcode, target: urlsTable.target})
    .from(urlsTable)
    .where(and(eq(urlsTable.id, req.params.id), eq(urlsTable.userId, req.user.id)));

    if(!url){
        return res.status(404).json({error: 'Shortcode not found or you do not have permission to view analytics'});
    }

    const stats = await getAnalyticsForUrl(url.id);

    return res.json({shortcode: url.shortcode, target: url.target, analytics: stats});
})

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
    console.log("DEBUG: User ID:", req.user?.id);
    console.log("DEBUG: Body received:", req.body);
    let  {url, code, description, expiresAt, password, isCollection, collectionLinks} = req.body;

    const isGuest = !req.user?.id;

    if(url && !url.startsWith('http://') && !url.startsWith('https://')){
        url=`http://${url}`;
    }

    const validationResult = await shortenpostRequestSchema.safeParseAsync({url, code});

    if(validationResult.error){
        return res.status(400).json({error: validationResult.error});
    }

    const validatedData = validationResult.data;
    const shortcode = validatedData.code ?? nanoid(8);
    const hashedPassword = (!isGuest && password) ? await bcrypt.hash(password, 12) : null;

    const normalizedLinks = (collectionLinks ?? []).map((link) => ({
        ...link,
        url: link.url?.startsWith('http') ? link.url : `https://${link.url}`,
    }));

    const collectionMode = String(isCollection) === 'true' || isCollection === true;

    const result = await createShortUrl({
        shortcode,
        target: validatedData.url,
        userId: req.user?.id ?? null,
        description: isGuest ? null : (description?.trim().slice(0, 150) || null),
        password: hashedPassword,
        expiresAt: (!isGuest && expiresAt) ? new Date(expiresAt) : null,
        isCollection: (!isGuest) ? collectionMode : false,
        collectionLinks: (!isGuest && normalizedLinks.length) ? normalizedLinks : [],
    });

    return res.status(201).json(result);
})

router.get('/resolve/:shortcode', async (req, res) => {
    const {shortcode} = req.params;

    const [result]= await db.select()
    .from(urlsTable)
    .where(eq(urlsTable.shortcode, shortcode));

    if(!result){
        return res.status(404).json({error: 'Shortcode not found'});
    }

    if (result.expiresAt && new Date(result.expiresAt) < new Date()) {
        return res.status(410).json({ error: 'This link has expired.' });
    }

    if(result.password){
        const password = req.headers['x-url-password']??req.query.password;
        if(!password){
            return res.status(401).json({error: 'Password required to access this link'});
        }
        const valid = await bcrypt.compare(password, result.password);
        if(!valid){
            return res.status(403).json({error: 'Invalid password'});
        }
    }

    logclick(result.id, req);

    if(result.isCollection){
        return res.json({
            collection: true,
            shortcode: result.shortcode,
            description: result.description,
            links: result.collectionLinks ?? [],
        });
    }

    return res.json({target: result.target});
});

router.get('/:shortcode', async (req, res) => {
  const { shortcode } = req.params;

  const [url] = await db
    .select()
    .from(urlsTable)
    .where(eq(urlsTable.shortcode, shortcode));

  if (!url) return res.status(404).json({ error: 'Shortcode not found' });

  if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'This link has expired.' });
  }

  if (url.password) {
    const provided = req.headers['x-url-password'] ?? req.query.password;
    if (!provided) return res.status(403).json({ protected: true, shortcode });
    const valid = await bcrypt.compare(provided, url.password);
    if (!valid) return res.status(403).json({ protected: true, error: 'Incorrect password.' });
  }

  logClick(url.id, req);

  if (url.isCollection) {
    return res.json({
      collection:  true,
      shortcode:   url.shortcode,
      description: url.description,
      links:       url.collectionLinks ?? [],
    });
  }

  return res.redirect(url.target);
});

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