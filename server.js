import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const KEY = process.env.WATCHMODE_API_KEY;
const subscriptions = ['netflix', 'disney+', 'peacock', 'paramount+', 'crunchyroll'];
const manifest = {
  id: 'community.arvio.source.selector', version: '0.5.0',
  name: 'Arvio Where to Watch (Beta)',
  description: 'US where-to-watch links: subscriptions, free, rent and buy. Real-Debrid stays in existing add-ons.',
  resources: ['stream'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: []
};
const cache = new Map();
function respond(res, data, status = 200) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=900'});
  res.end(JSON.stringify(data));
}
async function watchmode(path) {
  const response = await fetch('https://api.watchmode.com/v1' + path, {
    headers: {'X-API-Key': KEY, Accept: 'application/json'},
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) throw new Error('Watchmode returned HTTP ' + response.status);
  return response.json();
}
function validLink(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}
function render(sources) {
  const seen = new Set();
  return sources.filter(s => s.region === 'US').flatMap(s => {
    const link = validLink(s.web_url);
    if (!link) return [];
    const name = String(s.name || 'Provider');
    const type = String(s.type || '');
    const own = subscriptions.some(x => name.toLowerCase().includes(x));
    const label = {sub:'Subscription',free:'Free',rent:'Rent',buy:'Buy',tve:'TV login'}[type] || 'Watch';
    const price = (type === 'rent' || type === 'buy') && typeof s.price === 'number' ? ' $' + s.price.toFixed(2) : '';
    const key = [name,type,link].join('|');
    if (seen.has(key)) return [];
    seen.add(key);
    return [{name: label + ' • ' + name + (own && type === 'sub' ? ' ✓ Subscribed' : '') + price,
      title: label + ' — ' + name + price, externalUrl: link,
      externalUris: [{platform: 'android', uri: link}],\n      isSubscription: type === 'sub', isFree: type === 'free'}];
  });
}
async function streams(type, imdb, season, episode) {
  if (!KEY) return [];
  const cacheKey = [type,imdb,season,episode].join(':');
  const existing = cache.get(cacheKey);
  if (existing && existing.expires > Date.now()) return existing.data;
  let sources;
  if (type === 'series' && season !== undefined) {
    // Episode-level links are essential: do not claim whole-series availability for an episode.
    const payload = await watchmode('/title/' + imdb + '/episodes/?regions=US&season_number=' + season);
    const episodes = Array.isArray(payload) ? payload : (payload.episodes || payload.results || []);
    const target = episodes.find(e => Number(e.season_number) === season && Number(e.episode_number) === episode);
    sources = target?.sources || [];
  } else {
    sources = await watchmode('/title/' + imdb + '/sources/?regions=US');
  }
  const data = render(Array.isArray(sources) ? sources : []);
  cache.set(cacheKey, {data, expires:Date.now()+3600000});
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return data;
}
http.createServer(async (req,res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (path === '/manifest.json') return respond(res, manifest);
  if (path === '/health') return respond(res, {ok:true, watchmodeConfigured:Boolean(KEY)});
  const match = path.match(/^\/stream\/(movie|series)\/(tt\d+)(?::(\d+):(\d+))?\.json$/);
  if (!match) return respond(res,{error:'Not found'},404);
  try { return respond(res,{streams:await streams(match[1],match[2],match[3]===undefined?undefined:Number(match[3]),match[4]===undefined?undefined:Number(match[4]))}); }
  catch(err) { console.error(err.message); return respond(res,{streams:[]}); }
}).listen(PORT,'0.0.0.0',()=>console.log('Arvio Where to Watch listening'));
