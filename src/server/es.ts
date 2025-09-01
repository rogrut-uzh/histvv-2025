// src/server/es.ts
const ES_URL = process.env.ELASTICSEARCH_URL ?? '';

export async function esSearch(body: unknown) {
  if (!ES_URL) throw new Error('ELASTICSEARCH_URL ist nicht gesetzt');

  const res = await fetch(ES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const text = await res.text(); // erst Text holen -> bessere Fehlerdiagnose
  if (!res.ok) throw new Error(`ES ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`ES-Antwort kein gültiges JSON (erste 300 Zeichen): ${text.slice(0, 300)}`);
  }
}