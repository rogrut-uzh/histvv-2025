// src/components/SucheClient.jsx
import React, { useEffect, useRef } from 'react'
import MiniSearch from 'minisearch'



export default function SucheClient() {
  const nodeRef = useRef(null)

  useEffect(() => {
    const ac = new AbortController()
    let cancelled = false;
    
    async function loadData() {
        try {
            let veranstaltungen = await fetch('/data/tbl_veranstaltungen-merged.json', { signal: ac.signal }).then(r => r.json());
            let dozierende     = await fetch('/data/tbl_dozenten.json', { signal: ac.signal }).then(r => r.json());

            // Fakultätsliste (Set, alphabetisch)
            let alleFakultaeten = new Set();
            veranstaltungen.forEach(v => v.fak && alleFakultaeten.add(v.fak));
            dozierende.forEach(d => d.fak && alleFakultaeten.add(d.fak));
            alleFakultaeten = Array.from(alleFakultaeten).sort((a, b) => a.localeCompare(b));

            let searchIndex = [
              ...veranstaltungen
              .filter(v => !v.typ || v.typ === "veranstaltung")
              .map(v => ({
                ...v,
                typ: 'veranstaltung',
                id: v.id_veranstaltung,
                url: `/vv/${v.id_semester}#${v.id_veranstaltung}`,
                hauptfeld: [v.thema, v.zusatz, v.fak].filter(Boolean).join(' ')
              })),
              ...dozierende.map(d => ({
                ...d,
                typ: 'dozent',
                id: d.id_dozent,
                url: `/dozierende/${d.id_dozent}/`,
                hauptfeld: [d.nachname, d.vorname, d.fak, d.wikipedia, d.gagliardi, d.dekanat, d.rektor].filter(Boolean).join(' ')
              })),
            ];

            let miniSearch = new MiniSearch({
              fields: ['hauptfeld'],
              storeFields: [
                'typ', 'url', 'thema', 'nachname', 'vorname', 'fak', 'zusatz',
                'id_semester', 'id_veranstaltung', 'id_dozent'
              ],
              searchOptions: { prefix: true, fuzzy: 0.2 }
            });
            console.log(searchIndex)
            miniSearch.addAll(searchIndex);

            // Baue die UI in das nodeRef.current rein
            const root = nodeRef.current;
            if (!root || cancelled) return;   // <-- Guard
            root.innerHTML = `
        <fieldset class="Fieldset">

          <div class="FormInput">
            <label class="FormLabel" for="suchfeld">Suchbegriff</label>
            <input class="Input" autocomplete="off" id="suchfeld" name="suchfeld" type="text" aria-describedby="suchfeld-description">
            <!--<p class="FormDescription" id="suchfeld-description">Min. 3 Zeichen sind nötig.</p>-->
          </div>

          <fieldset class="FormInput">
            <legend class="FormLabel">Typ</legend>
            <div class="Options js-OptionInput inline" id="typ-filter">
              <div class="OptionInput">
                  <input id="typ_dozent" type="checkbox" name="typ" value="dozent">
                  <label class="label-dozierender-pill" for="typ_dozent">Dozierende(r)</label>
              </div>
              <div class="OptionInput">
                  <input id="typ_veranstaltung" type="checkbox" name="typ" value="veranstaltung">
                  <label class="label-veranstaltung-pill" for="typ_veranstaltung">Vorlesung</label>
              </div>
            </div>
          </fieldset>

          <fieldset class="FormInput">
            <legend class="FormLabel">Fakultät</legend>
            <div class="Options js-OptionInput inline" id="fakultaet-filter">
              ${alleFakultaeten.map((fak, id) => `
                <div class="OptionInput">
                  <input id="fak_${id}" type="checkbox" name="fakultaet" value="${fak}">
                  <label for="fak_${id}">${fak}</label>
                </div>
              `).join('')}
            </div>
          </fieldset>
        </fieldset>
        <div id="such-ergebnisse"></div>
            `;

            const suchfeld = root.querySelector('#suchfeld');
            const fakFilterInputs = root.querySelectorAll('input[name="fakultaet"]');
            const typFilterInputs = root.querySelectorAll('input[name="typ"]');
            const ergebnisContainer = root.querySelector('#such-ergebnisse');
            // Semester-Format-Helfer
            function formatSemesterLabel(id_semester) {
              if (!id_semester || id_semester.length < 5) return id_semester;
              const jahr = id_semester.slice(0, 4);
              const typ = id_semester[4].toLowerCase();
              return typ === "w" ? `WS ${jahr}` : typ === "s" ? `SS ${jahr}` : id_semester;
            }

            function doSearch() {
              const query = suchfeld.value.trim();
              const selectedFakultaeten = Array.from(fakFilterInputs).filter(cb => cb.checked).map(cb => cb.value);
              const selectedTypen = Array.from(typFilterInputs).filter(cb => cb.checked).map(cb => cb.value);

              if (query.length < 3) {
                ergebnisContainer.innerHTML = "<p>Bitte mindestens 3 Zeichen eingeben.</p>";
                return;
              }

              let treffer = miniSearch.search(query);

              // Fakultät-Filter
              if (selectedFakultaeten.length) {
                treffer = treffer.filter(t => t.fak && selectedFakultaeten.includes(t.fak));
              }
              // Typ-Filter
              if (selectedTypen.length) {
                treffer = treffer.filter(t => selectedTypen.includes(t.typ));
              }

              // Rendern
              let resultsHtml;
              if (treffer.length === 0) {
                resultsHtml = '<p>Keine Treffer gefunden.</p>';
              } else {
                const items = treffer.map(function (result) {
                  if (result.typ === 'veranstaltung') {
                    return (
                      '<div class="such-treffer veranstaltung">' +
                        '<span class="pill">Vorlesung:</span>' +
                        '<a href="' + result.url + '">' +
                          result.thema +
                          ' <span class="grautext">(' + (result.fak || '') + ', ' + formatSemesterLabel(result.id_semester) + ')</span>' +
                        '</a>' +
                      '</div>'
                    );
                  } else {
                    return (
                      '<div class="such-treffer dozierender">' +
                        '<span class="pill">Dozierende(r):</span>' +
                        '<a href="' + result.url + '">' +
                          result.nachname + ', ' + result.vorname +
                          (result.fak ? ' <span class="grautext">(' + result.fak + ')</span>' : '') +
                        '</a>' +
                      '</div>'
                    );
                  }
                }).join('');
                resultsHtml = '<p style="margin-bottom:0.5rem;">Resultate</p>' + items;
              }
              ergebnisContainer.innerHTML = resultsHtml;
            }

            // ✅ Listener NACH der Funktionsdefinition binden
            suchfeld.addEventListener('input', doSearch);
            fakFilterInputs.forEach(cb => cb.addEventListener('change', doSearch));
            typFilterInputs.forEach(cb => cb.addEventListener('change', doSearch));

            // ✅ Initialer Zustand / Autostart
            if (suchfeld.value.length >= 3) {
              doSearch();
            } else {
              ergebnisContainer.innerHTML = "<p>Bitte mindestens 3 Zeichen eingeben.</p>";
            }
            
        } catch (err) {
            if (err.name === 'AbortError') return
            console.error('SucheClient load error:', err)
            const root = nodeRef.current
            if (root && !cancelled) {
              root.innerHTML = `<p class="Text--error">Fehler beim Laden der Suche. Bitte neu laden.</p>`
            }
        } finally {
            if (!cancelled) {
              document.dispatchEvent(new CustomEvent('sucheclient:ready'))
            }
        }
    }
    loadData();
    return () => {
      cancelled = true
      ac.abort()
    }
  }, []);

  return <div ref={nodeRef} />
}
