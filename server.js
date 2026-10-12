import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const TMDB_TOKEN = process.env.TMDB_BEARER_TOKEN;
const providers = new Map([
  [8, 'Netflix'], [9, 'Prime Video (not subscribed)'],
  [337, 'Disney+'], [386, 'Peacock'], [387, 'Peacock Premium'],
  [531, 'Paramount+'], [582, 'Paramount+ Premium'], [283, 'Crunchyroll']
]);
const subscribed = new Set(['Netflix', 'Disney+', 'Peacock', 'Peacock Premium', 'Paramount+', 'Paramount+ Premium', 'Crunchyroll']);
const manifest = {
  id: 'community.arvio.source.selector', version: '0.3.0',
  name: 'Arvio Source Selector',
  description: 'US subscription availability links for your streaming services; Real-Debrid remains in your existing add-ons.',
  resources: ['stream'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: []
};
function respond(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=900' });
  res.end(JSON.stringify(data));
}
async function tmdb(path) {
  const response = await fetch('https://api.themoviedb.org/3' + path, {
    headers: { Authorization: 'Bearer ' + TMDB_TOKEN, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('TMDB HTTP ' + response.status);
  return response.json();
}
async function streams(type, imdb) {
  if (!TMDB_TOKEN) return [];
  const found = await tmdb('/find/' + encodeURIComponent(imdb) + '?external_source=imdb_id');
  const result = (type === 'movie' ? found.movie_results : found.tv_results)?.[0];
  if (!result) return [];
  const kind = type === 'movie' ? 'movie' : 'tv';
  const watch = await tmdb('/' + kind + '/' + result.id + '/watch/providers');
  const us = watch.results?.US;
  if (!us?.link) return [];
  const categories = [
    ['flatrate', 'Included with subscription'],
    ['free', 'Free'],
    ['ads', 'Free with ads'],
    ['rent', 'Rent'],
    ['buy', 'Buy']
  ];
  const options = [];
  const seen = new Set();
  for (const [key, label] of categories) {
    for (const provider of us[key] || []) {
      const name = providers.get(provider.provider_id) || provider.provider_name;
      if (!name) continue;
      const isSubscribed = subscribed.has(name);
      const display = name.replace(/ Premium$/, '');
      const unique = key + ':' + display;
      if (seen.has(unique)) continue;
      seen.add(unique);
      options.push({
        name: label + ' • ' + display + (isSubscribed ? ' ✓ Your subscription' : ''),
        title: label + ' — ' + display,
        externalUrl: us.link,
        description: 'View provider choices on TMDB. Direct provider deep links and prices are not available in this version.'
      });
    }
  }
  return options;
}
http.createServer(async (req, res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (path === '/manifest.json') return respond(res, manifest);
  if (path === '/health') return respond(res, { ok: true, tmdbConfigured: Boolean(TMDB_TOKEN) });
  const match = path.match(/^\/stream\/(movie|series)\/(tt\d+)(?::\d+:\d+)?\.json$/);
  if (!match) return respond(res, { error: 'Not found' }, 404);
  try { return respond(res, { streams: await streams(match[1], match[2]) }); }
  catch (err) { console.error(err); return respond(res, { streams: [] }); }
}).listen(PORT, '0.0.0.0', () => console.log('Arvio Source Selector on port ' + PORT));
