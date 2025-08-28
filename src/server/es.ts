// src/server/es.ts
const ES_URL   = process.env.ELASTICSEARCH_URL ?? '';
const ES_INDEX = process.env.HISTVV_INDEX ?? '';
const ES_USER  = process.env.ELASTICSEARCH_USERNAME ?? '';
const ES_PASS  = process.env.ELASTICSEARCH_PASSWORD ?? '';

let _envChecked = false;
function ensureEnv() {
  if (_envChecked) return;
  const missing: string[] = [];
  if (!ES_URL)   missing.push('ELASTICSEARCH_URL');
  if (!ES_INDEX) missing.push('HISTVV_INDEX');
  if (!ES_USER)  missing.push('ELASTICSEARCH_USERNAME');
  if (!ES_PASS)  missing.push('ELASTICSEARCH_PASSWORD');

  if (missing.length) {
    // Serverseitig: klar loggen und Fehler werfen 
    const msg = `[es.ts] Fehlende Umgebungsvariablen: ${missing.join(', ')}. `
              + `Bitte via .env / Vault / Deployment-Env setzen.`;
    console.error(msg);
    throw new Error(msg);
  }
  _envChecked = true;
}

function authHeader(): Record<string, string> {
  if (ES_USER && ES_PASS) {
    const token = Buffer.from(`${ES_USER}:${ES_PASS}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return {};
}

async function safeText(r: Response) { try { return await r.text(); } catch { return ''; } }

/**
 * Wrapper für Elasticsearch _search.
 * Nutzt ENV (URL/Index), prüft sie genau einmal und setzt BasicAuth falls vorhanden.
 */
export async function esSearch<T = unknown>(
  body: unknown,
  opts?: { index?: string; signal?: AbortSignal }
): Promise<{ hits: { hits: Array<{ _source: T }> }, aggregations?: any }> {
  ensureEnv();

  const index = opts?.index ?? ES_INDEX;
  const r = await fetch(`${ES_URL}/${index}/_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
    signal: opts?.signal
  });

  if (!r.ok) {
    const err = await safeText(r);
    // bewusst ohne Secrets; nur Status + kurze Meldung
    throw new Error(`Elasticsearch-Fehler (${r.status}): ${err || 'Keine Details'}`);
  }
  return r.json();
}

// Wenn du ES_INDEX nicht woanders direkt brauchst, kannst du diese Zeile weglassen.
// export const ES_INDEX = ES_INDEX;
