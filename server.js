import http from 'node:http';

const providers = [
  { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/search?q=' },
  { name: 'Netflix', url: 'https://www.netflix.com/search?q=' },
  { name: 'Disney+', url: 'https://www.disneyplus.com/search/' },
  { name: 'Peacock', url: 'https://www.peacocktv.com/search' },
  { name: 'Paramount+', url: 'https://www.paramountplus.com/' }
];

const manifest = {
  id: 'community.arvio.source.selector',
  version: '0.1.0',
  name: 'Arvio Source Selector (Prototype)',
  description: 'Prototype subscription links. Real-Debrid remains in your existing add-ons. Provider availability is NOT verified.',
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  behaviorHints: { configurable: false }
};

const json = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' });
  res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/manifest.json') return json(res, manifest);
  const match = path.match(/^\/stream\/(movie|series)\/(tt\d+(?::\d+:\d+)?)\.json$/);
  if (!match) return json(res, { error: 'Not found' }, 404);
  // We cannot reliably infer title names or verify provider availability from IMDb IDs alone.
  // Return no misleading links until a metadata + availability integration is implemented.
  return json(res, { streams: [] });
}).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Arvio Source Selector listening'));
