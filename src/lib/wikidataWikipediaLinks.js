export default async function fetchWikipediaLinks(entityId) {
  const result = {
    de: null,
    en: null,
  };
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`);
    const data = await res.json();
    const sitelinks = data.entities[entityId]?.sitelinks || {};
    if (sitelinks.dewiki) result.de = sitelinks.dewiki.url;
    if (sitelinks.enwiki) result.en = sitelinks.enwiki.url;
    return result;
  } catch (err) {
    console.error(`Fehler beim Laden der Wikipedia-Links für ${entityId}:`, err);
    return result;
  }
}
