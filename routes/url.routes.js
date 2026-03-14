import express from 'express'
import { shortenpostRequestSchema } from '../validation/request.validation.js';
import {db} from '../db/index.js';
import {urlsTable} from '../models/index.js'
import { nanoid } from 'nanoid';
import { ensureAuthenticated } from '../middlewares/auth.middleware.js';
import { createShortUrl } from '../services/url.service.js';
import { eq, and} from 'drizzle-orm';
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

export default router;