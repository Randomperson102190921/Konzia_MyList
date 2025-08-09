// /api/index.js  –  returns only what is in the sheet
import { URLSearchParams } from 'url';

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwzZaGtGg_1XkDbU1mcCj41woFzaQYXJyrAm60rEJJp5V-qOQVM2uuxPP-h5hrD03kMbw/exec';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    /* ---------- GET /api/index.js ---------- */
    if (req.method === 'GET') {
      // Forward all query params to the sheet
      const params = new URLSearchParams(req.query);
      const r = await fetch(`${SHEET_URL}?${params.toString()}`);
      const json = await r.json(); // sheet now returns {products:[...]}
      return res.status(200).json(json);
    }

    /* ---------- POST /api/index.js ---------- */
    if (req.method === 'POST') {
      // Same as before – stores a new row
      const body = {};
      ['product', 'city', 'shop', 'price'].forEach((k) => {
        if (typeof req.body[k] === 'string') body[k] = req.body[k].trim();
      });
      body.price = Number(body.price);
      if (!body.product || !body.city || !body.shop || isNaN(body.price) || body.price <= 0) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      body.timestamp = new Date().toISOString();

      // forward to sheet
      await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
