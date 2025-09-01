// scripts/index-elasticsearch.mjs
import fs from 'node:fs/promises';

const ES    = process.env.ELASTICSEARCH_URL || 'https://www.zi.uzh.ch/cgi-bin/esproxy/archiv_proxy_test.py';
const INDEX = process.env.HISTVV_INDEX      || 'uzh_archiv_histvv';
const PATH_V = process.env.DATA_VERANST     || 'data/tbl_veranstaltungen-merged.json';
const PATH_D = process.env.DATA_DOZ         || 'data/tbl_dozenten.json';

const ES_USER = process.env.ELASTICSEARCH_USERNAME || process.env.ES_USERNAME_ADM || '';
const ES_PASS = process.env.ELASTICSEARCH_PASSWORD || process.env.ES_PASSWORD || '';

const FORCE = process.env.FORCE_REINDEX === '1';

function authHeaders(extra = {}) {
  const h = { ...extra };
  if (ES_USER && ES_PASS) {
    h.Authorization = 'Basic ' + Buffer.from(`${ES_USER}:${ES_PASS}`).toString('base64');
  }
  return h;
}

async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function waitForES(url, tries = 60) {
  for (let i=0; i<tries; i++) {
    try { const r = await fetch(url, { headers: authHeaders() }); if (r.ok) return; } catch {}
    await sleep(2000);
  }
  throw new Error('Elasticsearch nicht erreichbar.');
}

// --- MAPPING ---
const mapping = {
  settings: {
    analysis: {
      analyzer: {
        de_analyzer: { type: "standard", stopwords: "_german_" },
        autocomplete: { tokenizer: "autocomplete", filter: ["lowercase"] }
      },
      tokenizer: {
        autocomplete: { type: "edge_ngram", min_gram: 2, max_gram: 20, token_chars: ["letter","digit"] }
      }
    }
  },
  mappings: {
    properties: {
      // Common
      typ:         { type: "keyword" },
      id_semester: { type: "keyword" },
      fak:         { type: "keyword" },

      // interne Seite
      site_url:    { type: "keyword" },

      // bisherige interne URL bei Veranstaltungen (lassen wir zur Kompatibilität drin)
      url:         { type: "keyword" },

      // Volltext
      hauptfeld:   { type: "text", analyzer: "autocomplete", search_analyzer: "de_analyzer" },

      // Veranstaltungen
      id_veranstaltung: { type: "keyword" },
      thema: { type: "text", analyzer: "de_analyzer", fields: { keyword: { type: "keyword" } } },
      thema_anmerkung:  { type: "text", analyzer: "de_analyzer" },
      zusatz:           { type: "text", analyzer: "de_analyzer" },
      vorlesungsnummer: { type: "keyword" },
      zeit:             { type: "keyword" },
      wochenstunden:    { type: "keyword" },
      ort:              { type: "keyword" },
      dozenten: {
        type: "object",
        properties: {
          id_dozent: { type: "keyword" },
          nachname:  { type: "text", analyzer: "de_analyzer" },
          vorname:   { type: "text", analyzer: "de_analyzer" },
          grad:      { type: "keyword" },
          funktion:  { type: "keyword" }
        }
      },

      // Dozierende
      id:         { type: "keyword" },           // = id_dozent
      nachname:   { type: "text", analyzer: "de_analyzer" },
      vorname:    { type: "text", analyzer: "de_analyzer" },
      geboren:    { type: "keyword" },
      gestorben:  { type: "keyword" },
      pnd:        { type: "keyword" },
      wikidata:   { type: "keyword" },
      wikipedia:  { type: "keyword" },

      fachgebiet:   { type: "text", analyzer: "de_analyzer" },
      habilitation: { type: "text", analyzer: "de_analyzer" },
      berufung:     { type: "text", analyzer: "de_analyzer" },

      // externe Links (Array)
      external_urls: { type: "keyword" }
    }
  }
};


async function ensureIndex() {
  const head = await fetch(`${ES}/${INDEX}`, { method: 'HEAD', headers: authHeaders() });
  if (head.status === 200) {
    if (!FORCE) {
      console.log(`Index ${INDEX} existiert – lasse Mapping wie ist (FORCE_REINDEX!=1).`);
      return false; // nichts neu angelegt
    }
    console.log(`Index ${INDEX} existiert – wird überschrieben (reindex).`);
    await fetch(`${ES}/${INDEX}`, { method: 'DELETE', headers: authHeaders() });
  }
  const res = await fetch(`${ES}/${INDEX}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(mapping)
  });
  if (!res.ok) throw new Error(`Index anlegen fehlgeschlagen: ${res.status} ${await res.text()}`);
  return true; // frisch angelegt
}

// --- buildDocs ---
function buildDocs(V, D) {
  const ENRICH = process.env.ENRICH_DOZENTEN !== '0'; // default: anreichern
  const dozMap = new Map((Array.isArray(D) ? D : []).map(d => [String(d.id_dozent), d]));

  const veranstaltungen = (Array.isArray(V) ? V : [])
    .filter(v => !v.typ || v.typ === 'veranstaltung')
    .map(v => {
      const dozentenArr = Array.isArray(v.dozenten) ? v.dozenten.map(d => {
        const id = d?.id_dozent != null ? String(d.id_dozent) : null;
        if (!ENRICH) {
          return {
            id_dozent: id,
            nachname:  d?.nachname ?? null,
            vorname:   d?.vorname  ?? null,
            grad:      d?.grad ?? null,
            funktion:  d?.funktion ?? null
          };
        }
        const ref = id ? dozMap.get(id) : undefined;
        return {
          id_dozent: id,
          nachname:  d?.nachname ?? ref?.nachname ?? (id === 'vakant' ? 'vakant' : null),
          vorname:   d?.vorname  ?? ref?.vorname  ?? null,
          grad:      d?.grad ?? null,
          funktion:  d?.funktion ?? null
        };
      }) : [];

      return {
        typ: 'veranstaltung',
        id: String(v.id_veranstaltung),
        id_veranstaltung: String(v.id_veranstaltung),
        // interne URLs konsistent benennen:
        site_url: `/vv/${v.id_semester}#${v.id_veranstaltung}`,
        url: `/vv/${v.id_semester}#${v.id_veranstaltung}`, // (Kompatibilität, kann später entfallen)

        fak: v.fak ?? null,
        id_semester: v.id_semester ?? null,

        thema: v.thema ?? null,
        thema_anmerkung: v.thema_anmerkung ?? null,
        zusatz: v.zusatz ?? null,
        vorlesungsnummer: v.vorlesungsnummer ?? null,
        zeit: v.zeit ?? null,
        wochenstunden: v.wochenstunden ?? null,
        ort: v.ort ?? null,

        dozenten: dozentenArr,

        hauptfeld: [v.thema, v.zusatz, v.fak].filter(Boolean).join(' ')
      };
    });

  const dozierende = (Array.isArray(D) ? D : []).map(d => ({
    typ: 'dozent',
    id: String(d.id_dozent),                // eindeutige ID
    site_url: `/dozierende/${d.id_dozent}/`,// interne Seite
    external_urls: Array.isArray(d.url) ? d.url.filter(Boolean) : [],

    fak: d.fak ?? null,
    nachname: d.nachname ?? null,
    vorname: d.vorname ?? null,

    geboren: d.geboren ?? null,
    gestorben: d.gestorben ?? null,
    pnd: d.pnd ?? null,
    wikidata: d.wikidata ?? null,
    wikipedia: d.wikipedia ?? null,

    fachgebiet: d.fachgebiet ?? null,
    habilitation: d.habilitation ?? null,
    berufung: d.berufung ?? null,

    // Felder, die für Dozenten nicht sinnvoll sind, bleiben null
    id_semester: null,
    thema: null,

    // Suche: Namen, Fakultät & Metadaten
    hauptfeld: [
      d.nachname, d.vorname, d.fak,
      d.fachgebiet, d.berufung, d.habilitation,
      d.wikipedia, d.wikidata, d.pnd
    ].filter(Boolean).join(' ')
  }));

  return [...veranstaltungen, ...dozierende];
}

async function bulkUpload(docs, chunkDocs = 5000) {
  let i = 0;
  while (i < docs.length) {
    const slice = docs.slice(i, i + chunkDocs);
    let ndjson = '';
    for (const doc of slice) {
      const _id = `${doc.typ}:${doc.id}`;
      ndjson += JSON.stringify({ index: { _index: INDEX, _id } }) + '\n';
      ndjson += JSON.stringify(doc) + '\n';
    }
    const res = await fetch(`${ES}/_bulk`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/x-ndjson' }),
      body: ndjson
    });
    const json = await res.json();
    if (json.errors) {
      const firstErr = json.items.find(x => x.index && x.index.error)?.index.error;
      throw new Error('Bulk-Fehler: ' + JSON.stringify(firstErr));
    }
    i += slice.length;
    console.log(`Bulk: ${i}/${docs.length} Dokumente`);
  }
  await fetch(`${ES}/${INDEX}/_refresh`, { method: 'POST', headers: authHeaders() });
}

(async () => {
  console.log(`Warte auf Elasticsearch unter ${ES} ...`);
  await waitForES(ES);

  console.log('Lese JSON-Daten ...');
  const [Vraw, Draw] = await Promise.all([
    fs.readFile(PATH_V, 'utf8').then(JSON.parse),
    fs.readFile(PATH_D, 'utf8').then(JSON.parse)
  ]);

  const created = await ensureIndex();
  console.log(created
    ? 'Index neu angelegt --> Vollaufbau.'
    : 'Index vorhanden --> Upsert via Bulk (Dokumente mit gleicher _id werden überschrieben).');

  console.log('Baue Dokumente...');
  const docs = buildDocs(Vraw, Draw);
  console.log(`Dokumente gesamt: ${docs.length}`);

  console.log('Bulk-Upload...');
  await bulkUpload(docs);

  console.log(`Fertig: ${docs.length} Dokumente in "${INDEX}" indiziert.`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});