// ─────────────────────────────────────────────────────────────
//  TrackMail — server.js
//  Tracking server. Deploy on Railway, Render, or any Node host.
//  npm install express cors
// ─────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory store — replace with PostgreSQL or Firebase in production
const events = {};

function getRecord(id) {
  if (!events[id]) {
    events[id] = { opens: 0, clicks: 0, openTimes: [], clickedLinks: [], lastOpenAt: null };
  }
  return events[id];
}

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

app.get('/track/open', (req, res) => {
  const { id } = req.query;
  if (id) {
    const rec = getRecord(id);
    rec.opens++;
    const now = new Date().toISOString();
    rec.openTimes.push(now);
    rec.lastOpenAt = now;
    console.log('[OPEN] id=' + id + ' | total_opens=' + rec.opens);
  }
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(PIXEL);
});

app.get('/track/click', (req, res) => {
  const { id, url } = req.query;
  if (id && url) {
    const rec = getRecord(id);
    rec.clicks++;
    rec.clickedLinks.push({ url, clickedAt: new Date().toISOString() });
    console.log('[CLICK] id=' + id + ' | url=' + url);
    res.redirect(302, decodeURIComponent(url));
  } else {
    res.status(400).send('Missing id or url');
  }
});

app.get('/api/stats/:id', (req, res) => {
  res.json(getRecord(req.params.id));
});

app.post('/api/stats/bulk', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const result = {};
  ids.forEach(id => { result[id] = getRecord(id); });
  res.json(result);
});

app.get('/health', (req, res) => res.json({ status: 'ok', tracked: Object.keys(events).length }));

app.listen(PORT, () => console.log('[TrackMail Server] Running on port ' + PORT));
