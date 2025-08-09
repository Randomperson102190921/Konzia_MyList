// /api/index.js  –  Vercel serverless function
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
    if (req.method === 'GET') {
      const params = new URLSearchParams(req.query).toString();
      const r = await fetch(`${SHEET_URL}?${params}`);
      const json = await r.json();
      return res.status(200).json(json);
    }

    if (req.method === 'POST') {
      const body = {};
      ['product', 'city', 'shop', 'price'].forEach(k => {
        if (typeof req.body[k] === 'string') body[k] = req.body[k].trim();
      });
      body.price = Number(body.price);
      if (!body.product || !body.city || !body.shop || isNaN(body.price) || body.price <= 0) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      body.timestamp = body.timestamp || new Date().toISOString();

      const r = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      return res.status(200).json(json);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
