// NCBI PubMed E-utilities client: https://www.ncbi.nlm.nih.gov/books/NBK25497/
// Requests are made only when a user asks for research, are throttled to NCBI's
// published limit (3/s without a key, 10/s with one), time out, and are cached.
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL = 'human-atlas-learning-studio';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 200;
const TIMEOUT_MS = 8000;
const cache = new Map();

let fetchImpl = (...args) => fetch(...args);
/** Test hook: swap the fetch implementation. */
export function setFetch(fn) { fetchImpl = fn; }
export function clearResearchCache() { cache.clear(); }

let queue = Promise.resolve();
const gapMs = () => (config.ncbiApiKey ? 110 : 350);
function throttled(task) {
  const run = queue.then(task);
  queue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, gapMs())));
  return run;
}

async function eutils(endpoint, params) {
  const url = new URL(`${BASE}/${endpoint}`);
  const all = { db: 'pubmed', retmode: 'json', tool: TOOL, ...params };
  if (config.ncbiEmail) all.email = config.ncbiEmail;
  if (config.ncbiApiKey) all.api_key = config.ncbiApiKey;
  for (const [k, v] of Object.entries(all)) url.searchParams.set(k, String(v));
  let res;
  try {
    res = await throttled(() => fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } }));
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw new HttpError(502, timedOut ? 'PubMed took too long to respond. Try again.' : 'PubMed could not be reached right now.');
  }
  if (res.status === 429) throw new HttpError(503, 'PubMed is limiting requests. Try again in a few seconds.');
  if (!res.ok) throw new HttpError(502, `PubMed returned an error (${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new HttpError(502, 'PubMed sent a response that could not be read.');
  }
}

/** Atlas names look like "left femur" or "Right lobe of liver"; drop side words so searches match papers. */
export function toQuery(term) {
  const cleaned = term.toLowerCase().replace(/\b(left|right)\b/g, ' ').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  return `(${cleaned || term})[Title/Abstract] AND anatomy`;
}

export function parseSummary(summary, ids) {
  const result = summary?.result ?? {};
  return ids
    .map((id) => result[id])
    .filter((doc) => doc && !doc.error && doc.title)
    .map((doc) => ({
      pmid: doc.uid,
      title: String(doc.title).replace(/<[^>]+>/g, ''),
      journal: doc.fulljournalname || doc.source || '',
      published: doc.pubdate || doc.epubdate || '',
      authors: (doc.authors ?? []).slice(0, 3).map((a) => a.name),
      moreAuthors: Math.max(0, (doc.authors?.length ?? 0) - 3),
      url: `https://pubmed.ncbi.nlm.nih.gov/${doc.uid}/`,
    }));
}

export async function searchPubMed(term) {
  const key = term.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.data, cached: true };

  const query = toQuery(term);
  const search = await eutils('esearch.fcgi', { term: query, retmax: 5, sort: 'relevance' });
  const ids = search?.esearchresult?.idlist ?? [];
  const total = Number(search?.esearchresult?.count ?? 0);
  const articles = ids.length ? parseSummary(await eutils('esummary.fcgi', { id: ids.join(',') }), ids) : [];
  const data = { term, query, total, articles, source: 'PubMed (NCBI E-utilities)' };

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), data });
  return { ...data, cached: false };
}
