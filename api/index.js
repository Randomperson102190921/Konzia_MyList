// /api/index.js  –  KONZIA “My List” price endpoint
import { URLSearchParams } from 'url';

/* ---------- config ---------- */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwzZaGtGg_1XkDbU1mcCj41woFzaQYXJyrAm60rEJJp5V-qOQVM2uuxPP-h5hrD03kMbw/exec';
const allowedKeys = ['product', 'city', 'shop', 'price'];
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/* ---------- tiny in-mem cache ---------- */
const priceCache = new Map(); // product → { prices:[], meta:{...} }

/* ---------- helpers ---------- */
const clamp = (n) => (isNaN(n) ? 0 : Math.max(0, n));

/* ---------- handler ---------- */
export default async function handler(req, res) {
  // CORS pre-flight
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    /* 1) POST – record a new price (back-office) */
    if (req.method === 'POST') {
      const body = {};
      allowedKeys.forEach((k) => {
        if (typeof req.body[k] === 'string') body[k] = req.body[k].trim();
      });
      body.price = clamp(Number(req.body.price));

      if (!body.product || !body.city || !body.shop || body.price <= 0) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      body.timestamp = new Date().toISOString();

      /* store locally */
      const arr = priceCache.get(body.product) || [];
      arr.push(body.price);
      priceCache.set(body.product, arr);

      /* forward to Google Sheet */
      await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return res.status(200).json({ avg: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) });
    }

    /* 2) GET – return enriched price info for one product */
    if (req.method === 'GET') {
      const product = String(req.query.product || '').trim();
      const city = String(req.query.city || '').trim();
      const shop = String(req.query.shop || '').trim();

      /* 2a) ask Google Sheet for live rows */
      const params = new URLSearchParams({ product, city, shop });
      const r = await fetch(`${SHEET_URL}?${params.toString()}`);
      const rows = await r.json(); // [{city,shop,price}, ...]

      /* 2b) merge with local cache for instant feedback */
      const cached = priceCache.get(product) || [];
      const allPrices = [...cached, ...rows.map((r) => Number(r.price))];

      if (!allPrices.length) {
        return res.status(404).json({ error: 'No price data yet' });
      }

      const cheapestPrice = Math.min(...allPrices);
      const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const cheapestRow = rows.find((r) => Number(r.price) === cheapestPrice);

      return res.status(200).json({
        avgPrice: avgPrice.toFixed(2),
        cheapestPrice: cheapestPrice.toFixed(2),
        cheapestStore: cheapestRow?.shop || 'N/A',
        priceRange: {
          min: Math.min(...allPrices).toFixed(2),
          max: Math.max(...allPrices).toFixed(2),
        },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
