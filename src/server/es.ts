const ES_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
export const ES_INDEX = process.env.HISTVV_INDEX || 'histvv';

async function safeText(r: Response) { try { return await r.text(); } catch { return ''; } }

export async function esSearch<T = unknown>(
  body: unknown,
  opts?: { index?: string; signal?: AbortSignal }
): Promise<{ hits: { hits: Array<{ _source: T }> }, aggregations?: any }> {
  const index = opts?.index ?? ES_INDEX;
  const r = await fetch(`${ES_URL}/${index}/_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts?.signal
  });
  if (!r.ok) {
    const err = await safeText(r);
    throw new Error(`ES ${r.status}: ${err}`);
  }
  return r.json();
}
