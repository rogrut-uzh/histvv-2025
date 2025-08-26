export const prerender = false;

import type { APIRoute } from 'astro';

const ES    = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const INDEX = process.env.HISTVV_INDEX || 'histvv';

export const GET: APIRoute = async ({ request }) => {
  const url   = new URL(request.url);
  const qRaw  = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);

  // Mehrfach-Filter
  const typs = url.searchParams.getAll('typ').filter(Boolean);  // dozent / veranstaltung
  const faks = url.searchParams.getAll('fak').filter(Boolean);
  const wantFacets = url.searchParams.has('facets');

  // Nur Facets (ohne Suche)
  if (wantFacets && !qRaw) {
    const aggBody = {
      query: { match_all: {} },
      size: 0,
      aggs: { fak: { terms: { field: 'fak', size: 200 } } }
    };
    const r = await fetch(`${ES}/${INDEX}/_search`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(aggBody) });
    if (!r.ok) return json({ facets:{ fak:[] }, error:`ES ${r.status} ${await safeText(r)}` }, 500);
    const j = await r.json();
    return json({ results: [], facets: { fak: (j.aggregations?.fak?.buckets ?? []).map((b:any)=>b.key) } });
  }

  if (qRaw && qRaw.length < 3) return json({ results: [], tooShort: true });

  // Common Filter (vom UI gesetzt)
  const filters:any[] = [];
  if (typs.length) filters.push({ terms: { typ: typs } });
  if (faks.length) filters.push({ terms: { fak: faks } });

  // Welche Typen durchsuchen? (wenn nichts gewählt, beide)
  const typesToSearch = typs.length ? typs : ['veranstaltung','dozent'];

  // Für Wikidata Klein->Groß-Q-Hilfe
  const qForKw = (qRaw.length >= 1 && qRaw[0] === 'q') ? ('Q' + qRaw.slice(1)) : qRaw;
  const onlyDigits = /^\d+$/.test(qRaw);

  const shouldClauses:any[] = [];

  // ─────────────────────────────────────────────
  // VERANSTALTUNG: fak, vorlesungsnummer, thema, thema_anmerkung
  // ─────────────────────────────────────────────
  if (typesToSearch.includes('veranstaltung') && qRaw.length >= 3) {
    shouldClauses.push({
      bool: {
        filter: [{ term: { typ: 'veranstaltung' } }],
        should: [
          {
            multi_match: {
              query: qRaw,
              type: 'most_fields',
              operator: 'and',
              fuzziness: 'AUTO:0,1',
              fuzzy_transpositions: false,
              fields: [
                'thema^3',
                'thema_anmerkung',
                'fak' // keyword → exakte Übereinstimmung
              ]
            }
          },
          { match_phrase_prefix: { thema: { query: qRaw, slop: 3, max_expansions: 50, boost: 1.2 } } },
          { match_phrase:        { thema: { query: qRaw, boost: 1.2 } } },

          // 👇 case-insensitive Prefix auf fak:
          ...(qRaw.length >= 2 ? [
            { wildcard: { fak: { value: `${qRaw}*`, case_insensitive: true, boost: 1.1 } } }
          ] : []),

          ...(qRaw.length >= 3 ? [
            { prefix: { vorlesungsnummer: { value: qRaw, boost: 2 } } } as any
          ] : [])
        ],
        minimum_should_match: 1
      }
    });
  }

  // ─────────────────────────────────────────────
  // DOZENT: fak, nachname, vorname, pnd (exact), wikidata (exact)
  // ─────────────────────────────────────────────
  if (typesToSearch.includes('dozent') && qRaw.length >= 3) {
    const dozentShould:any[] = [
      {
        multi_match: {
          query: qRaw,
          type: 'most_fields',
          operator: 'and',
          fuzziness: 'AUTO:0,1',
          fuzzy_transpositions: false,
          prefix_length: 1,
          fields: [
            'nachname^5',
            'vorname^3',
            'fak'
          ]
        }
      },
      { match_phrase:        { nachname: { query: qRaw, boost: 6 } } },
      { match_phrase:        { vorname:  { query: qRaw, boost: 3 } } },
      { match_phrase_prefix: { nachname: { query: qRaw, slop: 2, max_expansions: 50, boost: 1.5 } } },
      { match_phrase_prefix: { vorname:  { query: qRaw, slop: 2, max_expansions: 50, boost: 1.2 } } },
    ];

    // PND → exact match (nur Ziffern sinnvoll)
    if (qRaw.length >= 3 && onlyDigits) {
      dozentShould.push({ term: { pnd: { value: qRaw, boost: 5 } } });
    }

    // Wikidata → exact match (unterstütze klein/ groß „q“)
    if (qRaw.length >= 2) {
      if (qRaw[0] === 'q') {
        dozentShould.push(
          { term: { wikidata: { value: qRaw,   boost: 5 } } },
          { term: { wikidata: { value: qForKw, boost: 5 } } },
        );
      } else {
        dozentShould.push({ term: { wikidata: { value: qRaw, boost: 5 } } });
      }
    }

    shouldClauses.push({
      bool: {
        filter: [{ term: { typ: 'dozent' } }],
        should: dozentShould,
        minimum_should_match: 1
      }
    });
  }

  const body:any = {
    query: shouldClauses.length
      ? { bool: { filter: filters, should: shouldClauses, minimum_should_match: 1 } }
      : { bool: { filter: filters, must: [{ match_all: {} }] } },
    size: limit,
    _source: [
      'typ','site_url','url',
      // Veranstaltungen
      'thema','thema_anmerkung','vorlesungsnummer','id_semester','fak',
      // Dozierende
      'nachname','vorname','pnd','wikidata','id'
    ],
    sort: [{ _score: 'desc' }]
  };

  if (wantFacets) body.aggs = { fak: { terms: { field: 'fak', size: 200 } } };

  const r = await fetch(`${ES}/${INDEX}/_search`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!r.ok) return json({ results: [], error:`ES ${r.status} ${await safeText(r)}` }, 500);

  const j = await r.json();
  const results = (j.hits?.hits ?? []).map((h:any) => h._source);

  const out:any = { results };
  if (wantFacets) out.facets = { fak: (j.aggregations?.fak?.buckets ?? []).map((b:any)=>b.key) };

  return json(out);
};

function json(data:any, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }
  });
}
async function safeText(r:Response){ try { return await r.text(); } catch { return ''; } }
