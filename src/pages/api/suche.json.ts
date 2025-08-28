export const prerender = false;

import type { APIRoute } from 'astro';
import { esSearch } from '~/server/es';

export const GET: APIRoute = async ({ request }) => {
  const url   = new URL(request.url);
  const qRaw  = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);

  // Filter aus dem UI
  const typs = url.searchParams.getAll('typ').filter(Boolean);   // 'dozent' | 'veranstaltung'
  const faks = url.searchParams.getAll('fak').filter(Boolean);
  const wantFacets = url.searchParams.has('facets');

  // Nur Facets (ohne Suchstring)
  if (wantFacets && !qRaw) {
    try {
      const { aggregations } = await esSearch({
        query: { match_all: {} },
        size: 0,
        aggs: { fak: { terms: { field: 'fak', size: 200 } } }
      });
      const list = (aggregations?.fak?.buckets ?? []).map((b: any) => b.key);
      return json({ results: [], facets: { fak: list } });
    } catch (e: any) {
      return json({ facets: { fak: [] }, error: String(e?.message || e) }, 500);
    }
  }

  if (qRaw && qRaw.length < 3) {
    return json({ results: [], tooShort: true });
  }

  // Gemeinsame Filter
  const filters: any[] = [];
  if (typs.length) filters.push({ terms: { typ: typs } });
  if (faks.length) filters.push({ terms: { fak: faks } });

  // Welche Typen durchsuchen? (wenn nichts gewählt → beide)
  const typesToSearch = typs.length ? typs : ['veranstaltung', 'dozent'];

  // Genau-Matches Hilfen
  const onlyDigits = /^\d+$/.test(qRaw);
  const qForKw = (qRaw[0] === 'q') ? ('Q' + qRaw.slice(1)) : qRaw;

  const shouldClauses: any[] = [];

  // ─────────────────────────────────────────────
  // VERANSTALTUNG: fak, vorlesungsnummer, thema, thema_anmerkung
  // ─────────────────────────────────────────────
  if (typesToSearch.includes('veranstaltung') && qRaw.length >= 3) {
    shouldClauses.push({
      bool: {
        filter: [{ term: { typ: 'veranstaltung' } }],
        should: [
          // Freitext auf thema/thema_anmerkung + fak (keyword → exakt)
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
                'fak'
              ]
            }
          },
          // Prefix-Feeling auf thema
          { match_phrase_prefix: { thema: { query: qRaw, slop: 3, max_expansions: 50, boost: 1.2 } } },
          { match_phrase:        { thema: { query: qRaw, boost: 1.2 } } },

          // Fak-Prefix case-insensitive (keyword-Feld → wildcard)
          ...(qRaw.length >= 2 ? [
            { wildcard: { fak: { value: `${qRaw}*`, case_insensitive: true, boost: 1.1 } } }
          ] : []),

          // Vorlesungsnummer → prefix
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
    const dozentShould: any[] = [
      // Freitext mit Boosts
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
      // Exakte Phrasen geben extra Punkte
      { match_phrase:        { nachname: { query: qRaw, boost: 6 } } },
      { match_phrase:        { vorname:  { query: qRaw, boost: 3 } } },
      // Prefix-Feeling
      { match_phrase_prefix: { nachname: { query: qRaw, slop: 2, max_expansions: 50, boost: 1.5 } } },
      { match_phrase_prefix: { vorname:  { query: qRaw, slop: 2, max_expansions: 50, boost: 1.2 } } },
    ];

    // PND: nur exakter Treffer (nur Ziffern)
    if (onlyDigits && qRaw.length >= 3) {
      dozentShould.push({ term: { pnd: { value: qRaw, boost: 5 } } });
    }

    // Wikidata: exakter Treffer (unterstütze 'q...' und 'Q...')
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

  // Gesamtabfrage
  const body: any = {
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
  if (wantFacets) {
    body.aggs = { fak: { terms: { field: 'fak', size: 200 } } };
  }

  try {
    const { hits, aggregations } = await esSearch(body);
    const results = (hits?.hits ?? []).map((h: any) => h._source);
    const out: any = { results };
    if (wantFacets) out.facets = { fak: (aggregations?.fak?.buckets ?? []).map((b: any) => b.key) };
    return json(out);
  } catch (e: any) {
    return json({ results: [], error: String(e?.message || e) }, 500);
  }
};

// kleine Helper
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
