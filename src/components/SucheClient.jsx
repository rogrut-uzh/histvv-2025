// src/components/SucheClient.jsx
import React, { useEffect, useRef } from 'react'
import MiniSearch from 'minisearch'

export default function SucheClient({ veranstaltungen = [], dozierende = [] }) {
  const nodeRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    // remove spinner as soon as the island mounts
    const loader = document.getElementById('search-loader')
    if (loader) loader.remove() // or: loader.style.display = 'none'

    try {
      // Fakultätsliste
      const alleFakultaeten = Array.from(new Set([
        ...veranstaltungen.map(v => v.fak).filter(Boolean),
        ...dozierende.map(d => d.fak).filter(Boolean),
      ])).sort((a, b) => a.localeCompare(b))

      const searchIndex = [
        ...veranstaltungen
          .filter(v => !v.typ || v.typ === 'veranstaltung')
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
      ]

      const miniSearch = new MiniSearch({
        fields: ['hauptfeld'],
        storeFields: [
          'typ', 'url', 'thema', 'nachname', 'vorname', 'fak', 'zusatz',
          'id_semester', 'id_veranstaltung', 'id_dozent'
        ],
        searchOptions: { prefix: true, fuzzy: 0.2 }
      })
      miniSearch.addAll(searchIndex)

      const root = nodeRef.current
      if (!root || cancelled) return

      root.innerHTML = `
        <fieldset class="Fieldset">

          <div class="FormInput">
            <label class="FormLabel" for="suchfeld">Suchbegriff</label>
            <input class="Input" autocomplete="off" id="suchfeld" name="suchfeld" type="text" aria-describedby="suchfeld-description">
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
      `

      const suchfeld = root.querySelector('#suchfeld')
      const fakFilterInputs = root.querySelectorAll('input[name="fakultaet"]')
      const typFilterInputs = root.querySelectorAll('input[name="typ"]')
      const ergebnisContainer = root.querySelector('#such-ergebnisse')

      const formatSemesterLabel = (id_semester) => {
        if (!id_semester || id_semester.length < 5) return id_semester
        const jahr = id_semester.slice(0, 4)
        const typ = id_semester[4].toLowerCase()
        return typ === 'w' ? `WS ${jahr}` : typ === 's' ? `SS ${jahr}` : id_semester
      }

      function doSearch() {
        if (cancelled) return
        const query = suchfeld.value.trim()
        const selectedFakultaeten = Array.from(fakFilterInputs).filter(cb => cb.checked).map(cb => cb.value)
        const selectedTypen = Array.from(typFilterInputs).filter(cb => cb.checked).map(cb => cb.value)

        if (query.length < 3) {
          ergebnisContainer.innerHTML = '<p>Bitte mindestens 3 Zeichen eingeben.</p>'
          return
        }

        let treffer = miniSearch.search(query)

        if (selectedFakultaeten.length) {
          treffer = treffer.filter(t => t.fak && selectedFakultaeten.includes(t.fak))
        }
        if (selectedTypen.length) {
          treffer = treffer.filter(t => selectedTypen.includes(t.typ))
        }

        let resultsHtml
        if (treffer.length === 0) {
          resultsHtml = '<p>Keine Treffer gefunden.</p>'
        } else {
          const items = treffer.map(result => {
            if (result.typ === 'veranstaltung') {
              return (
                '<div class="such-treffer veranstaltung">' +
                  '<span class="pill">Vorlesung:</span>' +
                  '<a href="' + result.url + '">' +
                    result.thema +
                    ' <span class="grautext">(' + (result.fak || '') + ', ' + formatSemesterLabel(result.id_semester) + ')</span>' +
                  '</a>' +
                '</div>'
              )
            } else {
              return (
                '<div class="such-treffer dozierender">' +
                  '<span class="pill">Dozierende(r):</span>' +
                  '<a href="' + result.url + '">' +
                    result.nachname + (result.vorname ? ', ' + result.vorname : '') +
                    (result.fak ? ' <span class="grautext">(' + result.fak + ')</span>' : '') +
                  '</a>' +
                '</div>'
              )
            }
          }).join('')
          resultsHtml = '<p style="margin-bottom:0.5rem;">Resultate</p>' + items
        }
        ergebnisContainer.innerHTML = resultsHtml
      }

      // listeners
      suchfeld.addEventListener('input', doSearch)
      fakFilterInputs.forEach(cb => cb.addEventListener('change', doSearch))
      typFilterInputs.forEach(cb => cb.addEventListener('change', doSearch))

      // initial state
      if (suchfeld.value.length >= 3) {
        doSearch()
      } else {
        ergebnisContainer.innerHTML = '<p>Bitte mindestens 3 Zeichen eingeben.</p>'
      }

      // cleanup
      return () => {
        cancelled = true
        suchfeld.removeEventListener('input', doSearch)
        fakFilterInputs.forEach(cb => cb.removeEventListener('change', doSearch))
        typFilterInputs.forEach(cb => cb.removeEventListener('change', doSearch))
      }
    } catch (err) {
      console.error('SucheClient init error:', err)
      const root = nodeRef.current
      if (root && !cancelled) {
        root.innerHTML = '<p class="Text--error">Fehler beim Laden der Suche. Bitte neu laden.</p>'
      }
    }
  }, [veranstaltungen, dozierende])

  return <div ref={nodeRef} />
}
