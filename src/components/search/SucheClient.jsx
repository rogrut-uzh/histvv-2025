import React, { useEffect, useMemo, useRef, useState } from 'react';

// Semester-Label
function fmtSemester(id) {
  if (!id || id.length < 5) return id || '';
  const y = id.slice(0,4);
  const t = id[4].toLowerCase();
  return t === 'w' ? `WS ${y}` : t === 's' ? `SS ${y}` : id;
}

// kleiner Debouncer
function useDebouncedValue(value, delay=250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export default function SucheClient() {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query);
  const [typen, setTypen] = useState(new Set());           // leeres Set = beide zulassen
  const [faks, setFaks]   = useState(new Set());
  const [facets, setFacets] = useState([]);                // Liste aller Fächer
  const [results, setResults] = useState([]);
  const [msg, setMsg] = useState('Bitte mindestens 3 Zeichen eingeben.');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  // Loader entfernen, sobald Insel mounted
  useEffect(() => {
    const el = document.getElementById('search-loader');
    if (el) el.remove();
  }, []);

  // Facets laden (falls API das unterstützt); mit Fallback
  useEffect(() => {
    let cancelled = false;
    async function loadFacets() {
      try {
        const r = await fetch('/api/suche.json?facets=1');
        if (!r.ok) throw new Error('no facets endpoint');
        const j = await r.json();
        const fakList = j.facets?.fak || j.faculties || [];
        if (!cancelled) setFacets(Array.from(new Set(fakList)).sort((a,b)=>String(a).localeCompare(String(b))));
      } catch {
        // Fallback: keine Facets upfront; werden (soft) aus ersten Treffern gelernt.
        if (!cancelled) setFacets([]);
      }
    }
    loadFacets();
    return () => { cancelled = true; };
  }, []);

  // eigentliche Suche (auf debounced Query & Filter)
  useEffect(() => {
    // Regeln wie in deiner alten UI:
    if (!debounced || debounced.trim().length < 3) {
      setResults([]);
      setMsg('Bitte mindestens 3 Zeichen eingeben.');
      return;
    }

    // Abort vorheriger Request
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    async function run() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('q', debounced.trim());
      params.set('limit', '100');

      // Typ-Filter: wenn leer -> beide zulassen; sonst ausgewählte schicken
      if (typen.size > 0) {
        for (const t of typen) params.append('typ', t);     // mehrfach erlaubt: typ=dozent&typ=veranstaltung
      }
      // Fakultätsfilter
      if (faks.size > 0) {
        for (const f of faks) params.append('fak', f);
      }

      try {
        const r = await fetch(`/api/suche.json?${params.toString()}`, { signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        if (j.tooShort) {
          setResults([]);
          setMsg('Bitte mindestens 3 Zeichen eingeben.');
          setLoading(false);
          return;
        }

        const list = Array.isArray(j.results) ? j.results : [];
        setResults(list);

        // Falls wir noch keine Facets haben: aus Treffern ableiten (sanfter Fallback)
        if (facets.length === 0 && list.length > 0) {
          const fset = new Set(list.map(x => x.fak).filter(Boolean));
          setFacets(Array.from(fset).sort((a,b)=>String(a).localeCompare(String(b))));
        }

        setMsg(list.length ? '' : 'Keine Treffer gefunden.');
      } catch (e) {
        if (e.name !== 'AbortError') {
          setResults([]);
          setMsg('Suche nicht erreichbar.');
        }
      } finally {
        setLoading(false);
      }
    }
    run();

    return () => ac.abort();
  }, [debounced, Array.from(typen).join('|'), Array.from(faks).join('|')]); // deps über Strings

  // Render-Helpers
  function toggleTyp(t) {
    setTypen(prev => {
      const s = new Set(prev);
      if (s.has(t)) s.delete(t); else s.add(t);
      return s;
    });
  }
  function toggleFak(f) {
    setFaks(prev => {
      const s = new Set(prev);
      if (s.has(f)) s.delete(f); else s.add(f);
      return s;
    });
  }

  const grouped = useMemo(() => results, [results]);

  return (
    <div>
      <fieldset className="Fieldset">
        <div className="FormInput">
          <label className="FormLabel" htmlFor="suchfeld">Suchbegriff</label>
          <input
            id="suchfeld"
            className="Input"
            type="text"
            autoComplete="off"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-describedby="suchfeld-description"
          />
          {/* <p className="FormDescription" id="suchfeld-description">Min. 3 Zeichen sind nötig.</p> */}
        </div>

        <fieldset className="FormInput">
          <legend className="FormLabel">Typ</legend>
          <div className="Options js-OptionInput inline" id="typ-filter">
            <div className="OptionInput OptionInput--doz">
              <input id="typ_dozent" type="checkbox" checked={typen.has('dozent')} onChange={() => toggleTyp('dozent')} />
              <label className="label-dozierender-pill" htmlFor="typ_dozent">DozentIn(r)</label>
            </div>
            <div className="OptionInput OptionInput--ver">
              <input id="typ_veranstaltung" type="checkbox" checked={typen.has('veranstaltung')} onChange={() => toggleTyp('veranstaltung')} />
              <label className="label-veranstaltung-pill" htmlFor="typ_veranstaltung">Vorlesung</label>
            </div>
          </div>
        </fieldset>

        <fieldset className="FormInput">
          <legend className="FormLabel">Fakultät</legend>
          <div className="Options js-OptionInput inline" id="fakultaet-filter">
            {facets.length === 0 ? (
              <span style={{opacity:.7}}>–</span>
            ) : (
              facets.map((fak, id) => (
                <div className="OptionInput" key={id}>
                  <input id={`fak_${id}`} type="checkbox" checked={faks.has(fak)} onChange={() => toggleFak(fak)} />
                  <label htmlFor={`fak_${id}`}>{fak}</label>
                </div>
              ))
            )}
          </div>
        </fieldset>
      </fieldset>

      <div id="such-ergebnisse" aria-live="polite">
        {loading && <p>Suche läuft…</p>}
        {!loading && msg && <p>{msg}</p>}

        {!loading && !msg && grouped.length > 0 && (
          <>
            <p style={{marginBottom:'.5rem'}}>Resultate</p>
            {grouped.map((r, i) => {
              const href = r.site_url || r.url || '#';
              if (r.typ === 'veranstaltung') {
                return (
                  <div className="such-treffer veranstaltung" key={`v-${i}`}>
                    <span className="pill">Vorlesung:</span>{' '}
                    <a href={href}>
                      {r.thema}{' '}
                      <span className="grautext">
                        ({r.fak || ''}{r.id_semester ? `, ${fmtSemester(r.id_semester)}` : ''})
                      </span>
                    </a>
                  </div>
                );
              } else {
                // dozent
                const name = [r.nachname, r.vorname].filter(Boolean).join(', ');
                return (
                  <div className="such-treffer dozierender" key={`d-${i}`}>
                    <span className="pill">Dozierende(r):</span>{' '}
                    <a href={href}>
                      {name}{r.fak ? <span className="grautext"> ({r.fak})</span> : null}
                    </a>
                  </div>
                );
              }
            })}
          </>
        )}
      </div>
    </div>
  );
}
