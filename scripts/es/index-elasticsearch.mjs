import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ES_USER = process.env.ES_USERNAME_ADM;
const ES_PASS = process.env.ES_PASSWORD_ADM;
const ES = process.env.ES;
const ES_INDEX = process.env.ES_INDEX;
const PATH_V = process.env.PATH_V;
const PATH_D = process.env.PATH_D;

/*
  - typeof process.env.FORCE_REES_INDEX !== 'undefined' → prüft, ob die Env-Variable überhaupt gesetzt ist.
  - ? process.env.FORCE_REES_INDEX : '0' → nimm ihren Wert, sonst den Default '0'.
  - === '1' → ergibt true, wenn der (String-)Wert exakt '1' ist, sonst false.

Kurz: Nur wenn FORCE_REES_INDEX auf '1' steht, ist FORCE_REES_INDEX (die Konstante) true.
Alles andere (nicht gesetzt, '0', leer, etc.) ergibt false.
*/
const FORCE_REES_INDEX = (typeof process.env.FORCE_REES_INDEX !== 'undefined' ? process.env.FORCE_REES_INDEX : '1') === '1';

// Pfad zum Mapping: per ENV überschreibbar, default = Nachbar-Datei "mapping.json"
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING_PATH = process.env.ES_MAPPING_PATH || path.join(__dirname, 'mapping.json');

async function loadMapping() {
  try {
    const raw = await fs.readFile(MAPPING_PATH, 'utf8');
    const json = JSON.parse(raw);
    if (!json.mappings || !json.settings) {
      throw new Error('Mapping fehlt "mappings" oder "settings" – Datei: ' + MAPPING_PATH);
    }
    return json;
  } catch (err) {
    throw new Error('Mapping konnte nicht geladen werden (' + MAPPING_PATH + '): ' + (err && err.message ? err.message : String(err)));
  }
}

async function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function waitForES(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: authHeaders() });
      if (r.ok) {
        return;
      }
    } catch (e) {
      // ignorieren und erneut versuchen
    }
    await sleep(2000);
  }
  throw new Error('Elasticsearch nicht erreichbar.');
}

function authHeaders(extra = {}) {
  const h = {};
  for (const k of Object.keys(extra)) {
    h[k] = extra[k];
  }
  if (ES_USER && ES_PASS) {
    h.Authorization = 'Basic ' + Buffer.from(ES_USER + ':' + ES_PASS).toString('base64');
  }
  return h;
}

async function ensureIndex(mapping) {
  const head = await fetch(ES + '/' + ES_INDEX, { method: 'HEAD', headers: authHeaders() });
  if (head.status === 200) {
    if (!FORCE_REES_INDEX) {
      console.log('Index ' + ES_INDEX + ' existiert – lasse Mapping wie es ist (FORCE_REES_INDEX!=1).');
      return false;
    }
    console.log('Index ' + ES_INDEX + ' existiert – wird überschrieben (reindex).');
    const del = await fetch(ES + '/' + ES_INDEX, { method: 'DELETE', headers: authHeaders() });
    if (!del.ok) {
      throw new Error('Index löschen fehlgeschlagen: ' + del.status + ' ' + (await del.text()));
    }
  }
  const res = await fetch(ES + '/' + ES_INDEX, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(mapping)
  });
  if (!res.ok) {
    throw new Error('Index anlegen fehlgeschlagen: ' + res.status + ' ' + (await res.text()));
  }
  return true;
}

// --- buildDocs ---
function buildDocs(V, D) {
  const Darr = Array.isArray(D) ? D : [];
  const Varr = Array.isArray(V) ? V : [];

  const dozMap = new Map(Darr.map(function (d) {
    return [String(d.id_dozent), d];
  }));

  const veranstaltungen = Varr
    .filter(function (v) {
      return !v.typ || v.typ === 'veranstaltung';
    })
    .map(function (v) {
      let dozentenArr = [];
      if (Array.isArray(v.dozenten)) {
        dozentenArr = v.dozenten.map(function (d) {
          const id = d && d.id_dozent != null ? String(d.id_dozent) : null;
          const ref = id ? dozMap.get(id) : undefined;
          return {
            id_dozent: id,
            nachname: (d && d.nachname != null) ? d.nachname : (ref && ref.nachname != null) ? ref.nachname : (id === 'vakant' ? 'vakant' : null),
            vorname: (d && d.vorname != null) ? d.vorname : (ref && ref.vorname != null) ? ref.vorname : null,
            grad: (d && d.grad != null) ? d.grad : null,
            funktion: (d && d.funktion != null) ? d.funktion : null
          };
        });
      }

      return {
        typ: 'veranstaltung',
        id: String(v.id_veranstaltung),
        id_veranstaltung: String(v.id_veranstaltung),
        site_url: '/vv/' + v.id_semester + '#' + v.id_veranstaltung,
        url: '/vv/' + v.id_semester + '#' + v.id_veranstaltung,

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

  const dozierende = Darr.map(function (d) {
    let external = [];
    if (Array.isArray(d.url)) {
      external = d.url.filter(Boolean);
    }

    return {
      typ: 'dozent',
      id: String(d.id_dozent),
      site_url: '/dozierende/' + d.id_dozent + '/',
      external_urls: external,

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

      id_semester: null,
      thema: null,

      hauptfeld: [
        d.nachname, d.vorname, d.fak,
        d.fachgebiet, d.berufung, d.habilitation,
        d.wikipedia, d.wikidata, d.pnd
      ].filter(Boolean).join(' ')
    };
  });

  return veranstaltungen.concat(dozierende);
}

async function bulkUpload(docs, chunkDocs = 5000) {
  let i = 0;
  while (i < docs.length) {
    const slice = docs.slice(i, i + chunkDocs);
    let ndjson = '';
    for (const doc of slice) {
      const _id = doc.typ + ':' + doc.id;
      ndjson += JSON.stringify({ index: { _index: ES_INDEX, _id: _id } }) + '\n';
      ndjson += JSON.stringify(doc) + '\n';
    }
    const res = await fetch(ES + '/_bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/x-ndjson' }),
      body: ndjson
    });
    const json = await res.json();
    if (json && json.errors) {
      let firstErr = null;
      if (Array.isArray(json.items)) {
        for (const x of json.items) {
          if (x && x.index && x.index.error) {
            firstErr = x.index.error;
            break;
          }
        }
      }
      throw new Error('Bulk-Fehler: ' + JSON.stringify(firstErr));
    }
    i += slice.length;
    console.log('Bulk: ' + i + '/' + docs.length + ' Dokumente');
  }
  await fetch(ES + '/' + ES_INDEX + '/_refresh', { method: 'POST', headers: authHeaders() });
}

(async function () {
  console.log('Warte auf Elasticsearch unter ' + ES + ' ...');
  await waitForES(ES);

  console.log('Lade Mapping aus ' + MAPPING_PATH + ' ...');
  const mapping = await loadMapping();

  console.log('Lese JSON-Daten ...');
  const Vraw = JSON.parse(await fs.readFile(PATH_V, 'utf8'));
  const Draw = JSON.parse(await fs.readFile(PATH_D, 'utf8'));

  const created = await ensureIndex(mapping);
  if (created) {
    console.log('Index neu angelegt --> Vollaufbau.');
  } else {
    console.log('Index vorhanden --> Upsert via Bulk (Dokumente mit gleicher _id werden überschrieben).');
  }

  console.log('Baue Dokumente...');
  const docs = buildDocs(Vraw, Draw);
  console.log('Dokumente gesamt: ' + docs.length);

  console.log('Bulk-Upload...');
  await bulkUpload(docs);

  console.log('Fertig: ' + docs.length + ' Dokumente in "' + ES_INDEX + '" indiziert.');
}()).catch(function (err) {
  console.error(err);
  process.exit(1);
});
