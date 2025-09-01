// src/server/es.ts
const ES_URL   = process.env.ELASTICSEARCH_URL || '';
export const ES_INDEX = process.env.HISTVV_INDEX || '';
//const ES_USER  = process.env.ELASTICSEARCH_USERNAME || '';
//const ES_PASS  = process.env.ELASTICSEARCH_PASSWORD || '';

function requireConfig() {
  const missing: string[] = [];
  if (!ES_URL)   missing.push('ELASTICSEARCH_URL');
  if (!ES_INDEX) missing.push('HISTVV_INDEX');
  if (missing.length) {
    throw new Error(`[es.ts] Fehlende Umgebungsvariablen: ${missing.join(', ')}. Bitte via .env / Vault / Deployment-Env setzen.`);
  }
}

/*
function authHeaders(): Record<string, string> {
  if (ES_USER && ES_PASS) {
    const token = Buffer.from(`${ES_USER}:${ES_PASS}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return {};
}
*/

async function safeText(r: Response) { try { return await r.text(); } catch { return ''; } }

export async function esSearch<T = unknown>(
  body: unknown,
  opts?: { index?: string; signal?: AbortSignal }
): Promise<{ hits: { hits: Array<{ _source: T }> }, aggregations?: any }> {
  requireConfig();
  const index = opts?.index ?? ES_INDEX;

  const r = await fetch(`${ES_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', },
    body: JSON.stringify(body),
    signal: opts?.signal
  });
/*
  const r = await fetch(`${ES_URL}/${index}/_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    signal: opts?.signal
  });
*/
  if (!r.ok) {
    const err = await safeText(r);
    throw new Error(`ES ${r.status}: ${err}`);
  }
  return r.json();
}
