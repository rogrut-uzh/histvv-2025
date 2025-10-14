export const prerender = false;

import type { APIRoute } from 'astro';
import { esSearch } from '~/server/es';

// ════════════════════════════════════════════════════════════════════════════
// KONFIGURATION: Fuzziness & Search-Parameter
// ════════════════════════════════════════════════════════════════════════════

const SEARCH_CONFIG = {
  // Minimum Query Length
  minQueryLength: 3,
  minPndLength: 8,          // PND hat 8-9 Stellen
  minWikidataLength: 2,
  
  // Fuzziness-Einstellungen (restriktiver als vorher)
  fuzziness: {
    value: 'AUTO:4,7',       // ab 4 Zeichen: 1 Edit, ab 7 Zeichen: 2 Edits
    prefix_length: 2,         // Erste 2 Zeichen müssen exakt matchen
    fuzzy_transpositions: true, // Erlaubt Buchstabendreher (Mueller/Muelelr)
    max_expansions: 50
  },
  
  // Boost-Hierarchie (klare Abstufung)
  boosts: {
    exactPhrase: 10,         // Exakte Phrasen-Matches
    multiMatch: 5,           // Multi-Field Fuzzy
    prefix: 3,               // Prefix-Matches
    partial: 2,              // Phrase-Prefix mit slop
    wildcard: 1.5,           // Wildcard-Matches
    ids: 10                  // PND, Wikidata
  },
  
  // Weitere Parameter
  maxResults: 200,
  defaultLimit: 50,
  phraseSlop: 1,            // Reduziert von 2-3 auf 1
  maxExpansions: 50
};

// ════════════════════════════════════════════════════════════════════════════
// API ROUTE
// ════════════════════════════════════════════════════════════════════════════

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const qRaw = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || String(SEARCH_CONFIG.defaultLimit), 10) || SEARCH_CONFIG.defaultLimit,
    SEARCH_CONFIG.maxResults
  );

  // Filter aus dem UI
  const typs = url.searchParams.getAll('typ').filter(Boolean);
  const faks = url.searchParams.getAll('fak').filter(Boolean);
  const nurDekanat = url.searchParams.get('dekanat') === '1' || url.searchParams.get('dekanat') === 'true';
  const nurRektor = url.searchParams.get('rektor') === '1' || url.searchParams.get('rektor') === 'true';
  const wantFacets = url.searchParams.has('facets');

  // ──────────────────────────────────────────────────────────────────────────
  // Nur Facets (ohne Suchstring)
  // ──────────────────────────────────────────────────────────────────────────
  if (wantFacets && !qRaw) {
    try {
      const { aggregations } = await esSearch({
        query: { match_all: {} },
        size: 0,
        aggs: { 
            fak: { 
                terms: { 
                    field: 'fak.raw', 
                    size: 200 
                } 
            } 
        }
      });
      const list = (aggregations?.fak?.buckets ?? []).map((b: any) => b.key);
      return json({ results: [], facets: { fak: list } });
    } catch (e: any) {
      return json({ facets: { fak: [] }, error: String(e?.message || e) }, 500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Query zu kurz
  // ──────────────────────────────────────────────────────────────────────────
  if (qRaw && qRaw.length < SEARCH_CONFIG.minQueryLength) {
    return json({ results: [], tooShort: true });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Filter aufbauen
  // ──────────────────────────────────────────────────────────────────────────
  const filters: any[] = [];
  if (typs.length) filters.push({ terms: { typ: typs } });
  if (faks.length) filters.push({ terms: { fak: faks } });

  // Welche Typen durchsuchen?
  const typesToSearch = typs.length ? typs : ['veranstaltung', 'dozent'];

  // Hilfs-Checks
  const onlyDigits = /^\d+$/.test(qRaw);
  const qForKw = (qRaw[0] === 'q' || qRaw[0] === 'Q') ? ('Q' + qRaw.slice(1)) : qRaw;

  const shouldClauses: any[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  // VERANSTALTUNGEN
  // ══════════════════════════════════════════════════════════════════════════
  if (typesToSearch.includes('veranstaltung') && qRaw.length >= SEARCH_CONFIG.minQueryLength) {
    const veranstaltungShould: any[] = [];

    // ────────────────────────────────────────────────────────────────────────
    // 1. Multi-Match mit restriktiver Fuzziness
    // ────────────────────────────────────────────────────────────────────────
    veranstaltungShould.push({
      multi_match: {
        query: qRaw,
        type: 'most_fields',
        operator: 'and',
        fuzziness: SEARCH_CONFIG.fuzziness.value,
        prefix_length: SEARCH_CONFIG.fuzziness.prefix_length,
        fuzzy_transpositions: SEARCH_CONFIG.fuzziness.fuzzy_transpositions,
        max_expansions: SEARCH_CONFIG.fuzziness.max_expansions,
        fields: [
          `thema^${SEARCH_CONFIG.boosts.multiMatch}`,
          'thema_anmerkung',
          'fak'
        ]
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // 2. Exakte Phrasen (höchste Priorität)
    // ────────────────────────────────────────────────────────────────────────
    veranstaltungShould.push({
      match_phrase: {
        thema: {
          query: qRaw,
          boost: SEARCH_CONFIG.boosts.exactPhrase
        }
      }
    });

    veranstaltungShould.push({
      match_phrase: {
        thema_anmerkung: {
          query: qRaw,
          boost: SEARCH_CONFIG.boosts.exactPhrase * 0.7
        }
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // 3. Phrase-Prefix (für Autocomplete-Gefühl)
    // ────────────────────────────────────────────────────────────────────────
    veranstaltungShould.push({
      match_phrase_prefix: {
        thema: {
          query: qRaw,
          slop: SEARCH_CONFIG.phraseSlop,
          max_expansions: SEARCH_CONFIG.maxExpansions,
          boost: SEARCH_CONFIG.boosts.partial
        }
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // 4. Fakultät: Wildcard (erst ab 2 Zeichen)
    // ────────────────────────────────────────────────────────────────────────
    if (qRaw.length >= 2) {
      veranstaltungShould.push({
        wildcard: {
          fak: {
            value: `${qRaw.toLowerCase()}*`,
            case_insensitive: true,
            boost: SEARCH_CONFIG.boosts.wildcard
          }
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. Vorlesungsnummer: Prefix (erst ab 3 Zeichen)
    // ────────────────────────────────────────────────────────────────────────
    if (qRaw.length >= 3) {
      veranstaltungShould.push({
        prefix: {
          vorlesungsnummer: {
            value: qRaw,
            boost: SEARCH_CONFIG.boosts.prefix
          }
        }
      });
    }

    shouldClauses.push({
      bool: {
        filter: [{ term: { typ: 'veranstaltung' } }],
        should: veranstaltungShould,
        minimum_should_match: 1
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DOZIERENDE
  // ══════════════════════════════════════════════════════════════════════════
  if (typesToSearch.includes('dozent') && qRaw.length >= SEARCH_CONFIG.minQueryLength) {
    const dozentShould: any[] = [];

    // ────────────────────────────────────────────────────────────────────────
    // 1. Multi-Match mit restriktiver Fuzziness
    // ────────────────────────────────────────────────────────────────────────
    dozentShould.push({
      multi_match: {
        query: qRaw,
        type: 'most_fields',
        operator: 'and',
        fuzziness: SEARCH_CONFIG.fuzziness.value,
        prefix_length: SEARCH_CONFIG.fuzziness.prefix_length,
        fuzzy_transpositions: SEARCH_CONFIG.fuzziness.fuzzy_transpositions,
        max_expansions: SEARCH_CONFIG.fuzziness.max_expansions,
        fields: [
          `nachname^${SEARCH_CONFIG.boosts.multiMatch}`,
          `vorname^${SEARCH_CONFIG.boosts.multiMatch * 0.6}`,
          'fak'
        ]
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // 2. Exakte Phrasen (höchste Priorität)
    // ────────────────────────────────────────────────────────────────────────
    dozentShould.push({
      match_phrase: {
        nachname: {
          query: qRaw,
          boost: SEARCH_CONFIG.boosts.exactPhrase
        }
      }
    });

    dozentShould.push({
      match_phrase: {
        vorname: {
          query: qRaw,
          boost: SEARCH_CONFIG.boosts.exactPhrase * 0.6
        }
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // 3. Phrase-Prefix (für teilweise Eingaben)
    // ────────────────────────────────────────────────────────────────────────
    dozentShould.push({
      match_phrase_prefix: {
        nachname: {
          query: qRaw,
          slop: SEARCH_CONFIG.phraseSlop,
          max_expansions: SEARCH_CONFIG.maxExpansions,
          boost: SEARCH_CONFIG.boosts.partial
        }
      }
    });

    dozentShould.push({
      match_phrase_prefix: {
        vorname: {
          query: qRaw,
          slop: SEARCH_CONFIG.phraseSlop,
          max_expansions: SEARCH_CONFIG.maxExpansions,
          boost: SEARCH_CONFIG.boosts.partial * 0.8
        }
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // 4. PND: nur exakter Treffer (nur Ziffern, mindestens 8 Zeichen)
    // ────────────────────────────────────────────────────────────────────────
    if (onlyDigits && qRaw.length >= SEARCH_CONFIG.minPndLength) {
      dozentShould.push({
        term: {
          pnd: {
            value: qRaw,
            boost: SEARCH_CONFIG.boosts.ids
          }
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. Wikidata: exakter Treffer (unterstütze 'q...' und 'Q...')
    // ────────────────────────────────────────────────────────────────────────
    if (qRaw.length >= SEARCH_CONFIG.minWikidataLength) {
      const firstChar = qRaw[0].toLowerCase();
      
      if (firstChar === 'q') {
        // Normalisiere zu Großbuchstaben 'Q'
        dozentShould.push({
          term: {
            wikidata: {
              value: qForKw,
              boost: SEARCH_CONFIG.boosts.ids
            }
          }
        });
      }
    }

    // Baue Filter-Array für Dozenten
    const dozentFilters: any[] = [{ term: { typ: 'dozent' } }];
    
    // ODER-Verknüpfung wenn beide ausgewählt sind, sonst einzelner Filter
    if (nurDekanat && nurRektor) {
      // Beide ausgewählt: Dekanat ODER Rektor
      dozentFilters.push({
        bool: {
          should: [
            { exists: { field: 'dekanat' } },
            { exists: { field: 'rektor' } }
          ],
          minimum_should_match: 1
        }
      });
    } else if (nurDekanat) {
      // Nur Dekanat
      dozentFilters.push({ exists: { field: 'dekanat' } });
    } else if (nurRektor) {
      // Nur Rektor
      dozentFilters.push({ exists: { field: 'rektor' } });
    }

    shouldClauses.push({
      bool: {
        filter: dozentFilters,
        should: dozentShould,
        minimum_should_match: 1
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GESAMTABFRAGE
  // ══════════════════════════════════════════════════════════════════════════
  const body: any = {
    query: shouldClauses.length
      ? {
          bool: {
            filter: filters,
            should: shouldClauses,
            minimum_should_match: 1
          }
        }
      : {
          bool: {
            filter: filters,
            must: [{ match_all: {} }]
          }
        },
    size: limit,
    _source: [
      'typ', 'site_url', 'url',
      // Veranstaltungen
      'thema', 'thema_anmerkung', 'vorlesungsnummer', 'id_semester', 'fak',
      // Dozierende
      'nachname', 'vorname', 'pnd', 'wikidata', 'id'
    ],
    sort: [{ _score: 'desc' }]
  };

  if (wantFacets) {
    body.aggs = {
      fak: { 
        terms: { 
          field: 'fak.raw', 
          size: 200 
        } 
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUSFÜHRUNG
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const { hits, aggregations } = await esSearch(body);
    const results = (hits?.hits ?? []).map((h: any) => h._source);
    
    const out: any = { results };
    if (wantFacets) {
      out.facets = {
        fak: (aggregations?.fak?.buckets ?? []).map((b: any) => b.key)
      };
    }
    
    return json(out);
  } catch (e: any) {
    console.error('Elasticsearch error:', e);
    return json(
      {
        results: [],
        error: String(e?.message || e)
      },
      500
    );
  }
};

// ════════════════════════════════════════════════════════════════════════════
// HELPER
// ════════════════════════════════════════════════════════════════════════════
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}