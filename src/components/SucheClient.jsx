// src/components/SucheClient.jsx
import React, { useEffect, useRef } from 'react'
import MiniSearch from 'minisearch'

export default function SucheClient() {
  const nodeRef = useRef(null)

  useEffect(() => {
    async function loadData() {
      let veranstaltungen = await fetch('/data/tbl_veranstaltungen.json').then(r => r.json());
      let dozierende = await fetch('/data/tbl_dozenten.json').then(r => r.json());

      // Fakultätsliste (Set, alphabetisch)
      let alleFakultaeten = new Set();
      veranstaltungen.forEach(v => v.fak && alleFakultaeten.add(v.fak));
      dozierende.forEach(d => d.fak && alleFakultaeten.add(d.fak));
      alleFakultaeten = Array.from(alleFakultaeten).sort((a, b) => a.localeCompare(b));

      let searchIndex = [
        ...veranstaltungen.map(v => ({
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
      miniSearch.addAll(searchIndex);

      // Baue die UI in das nodeRef.current rein!
      const root = nodeRef.current;
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
          <label for="typ_dozent">Dozent</label>
      </div>
      <div class="OptionInput">
          <input id="typ_veranstaltung" type="checkbox" name="typ" value="veranstaltung">
          <label for="typ_veranstaltung">Veranstaltung</label>
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
        ergebnisContainer.innerHTML = treffer.length === 0
          ? "<p>Keine Treffer gefunden.</p>"
          : treffer.map(result => {
              if (result.typ === "veranstaltung") {
                return `
                  <div class="such-treffer veranstaltung">
                    <a href="${result.url}">
                      <b>Vorlesung:</b> ${result.thema}
                      <span style="color:#888;">(${result.fak}, ${result.id_semester})</span>
                    </a>
                    ${result.zusatz ? `<div><small>${result.zusatz}</small></div>` : ""}
                  </div>
                `;
              } else {
                return `
                  <div class="such-treffer dozent">
                    <a href="${result.url}">
                      <b>Dozent/in:</b> ${result.nachname}, ${result.vorname}
                      ${result.fak ? `<span style="color:#888;">(${result.fak})</span>` : ""}
                    </a>
                  </div>
                `;
              }
            }).join("");
      }

      suchfeld.addEventListener('input', doSearch);
      fakFilterInputs.forEach(cb => cb.addEventListener('change', doSearch));
      typFilterInputs.forEach(cb => cb.addEventListener('change', doSearch));

      // Optional: Autostart Suche falls Wert im Inputfeld
      if (suchfeld.value.length >= 3) doSearch();
      else ergebnisContainer.innerHTML = "<p>Bitte mindestens 3 Zeichen eingeben.</p>";
    }
    loadData();
  }, []);

  return <div ref={nodeRef} />
}
