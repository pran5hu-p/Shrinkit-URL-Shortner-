import {UAParser} from "ua-parser-js";
import {db} from "../db/index.js";
import { analyticsTable } from "../models/analytics.model.js";
import { eq, inArray } from "drizzle-orm";

export function logclick(urlId, req){
    _insert(urlId, req).catch((err) =>
        console.error('[analytics] insert error:', err?.message)
    );
}

async function _insert(urlId, req) {
  const ua     = req.headers['user-agent'] ?? '';
  const parser = new UAParser(ua);
  const result = parser.getResult();

  const country =
    req.headers['cf-ipcountry'] ??
    req.headers['x-country'] ??
    null;

  const deviceType = result.device?.type ?? 'Desktop';
  const os         = result.os?.name ?? null;
  const browser    = result.browser?.name ?? null;

  await db.insert(analyticsTable).values({
    urlId,
    device:  deviceType,
    os,
    browser,
    country,
  });
}

export async function getAnalyticsForUrl(urlId){
  const rows = await db.select()
  .from(analyticsTable)
  .where(eq(analyticsTable.urlId, urlId))
  .orderBy(analyticsTable.timestamp);

  return aggregateRows(rows);
}

export async function getAnalyticsForUrls(urlIds){
  if (!urlIds || urlIds.length === 0) return aggregateRows([]);
  const rows = await db.select()
  .from(analyticsTable)
  .where(inArray(analyticsTable.urlId, urlIds))
  .orderBy(analyticsTable.timestamp);

  return aggregateRows(rows);
}

function aggregateRows(rows) {
  const byDevice  = countBy(rows, 'device');
  const byBrowser = countBy(rows, 'browser');
  const byOs      = countBy(rows, 'os');
  const byCountry = countBy(rows, 'country');

  const now     = Date.now();
  const msInDay = 86_400_000;
  const dailyMap = {};

  for (const row of rows) {
    const daysAgo = Math.floor((now - new Date(row.timestamp).getTime()) / msInDay);
    if (daysAgo <= 30) {
      const label = new Date(row.timestamp).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });
      dailyMap[label] = (dailyMap[label] ?? 0) + 1;
    }
  }

  const recentClicks = Object.entries(dailyMap).map(([date, clicks]) => ({
    date,
    clicks,
  }));

  return {
    total: rows.length,
    byDevice:  toPieData(byDevice),
    byBrowser: toPieData(byBrowser),
    byOs:      toPieData(byOs),
    byCountry: toPieData(byCountry),
    recentClicks,
  };
}

function toPieData(countMap) {
  return Object.entries(countMap).map(([name, value]) => ({ name, value }));
}

function countBy(arr, key) {
  return arr.reduce((acc, row) => {
    const val = row[key] ?? 'Unknown';
    acc[val] = (acc[val] ?? 0) + 1;
    return acc;
  }, {});
}