// src/lib/wiki/index.ts
export async function fetchWikipediaLinks(entityId: string): Promise<{de: string|null; en: string|null}> {
  const result = { de: null as string|null, en: null as string|null };
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`);
    const data = await res.json();
    const sitelinks = data.entities?.[entityId]?.sitelinks ?? {};
    if (sitelinks.dewiki) result.de = sitelinks.dewiki.url;
    if (sitelinks.enwiki) result.en = sitelinks.enwiki.url;
  } catch (err) {
    console.error(`Fehler beim Laden der Wikipedia-Links für ${entityId}:`, err);
  }
  return result;
}

export async function fetchWikipediaImage(
  wikiLang: string,
  articleTitle: string,
  size = 300
): Promise<string|null> {
  try {
    const url = `https://${wikiLang}.wikipedia.org/w/api.php` +
      `?action=query&titles=${encodeURIComponent(articleTitle)}&prop=pageimages&format=json` +
      `&pithumbsize=${size}&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages || {};
    const firstPage: any = Object.values(pages)[0];
    return firstPage?.thumbnail?.source ?? null;
  } catch (err) {
    console.error(`Fehler beim Laden des Wikipedia-Bilds für ${wikiLang}:${articleTitle}:`, err);
    return null;
  }
}
