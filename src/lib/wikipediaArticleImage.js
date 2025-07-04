export default async function fetchWikipediaImage(wikiLang, articleTitle, size = 300) {
  try {
    const url = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=pageimages&format=json&pithumbsize=${size}&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages || {};
    const firstPage = Object.values(pages)[0];
    if (firstPage?.thumbnail?.source) {
      return firstPage.thumbnail.source;
    }
    return null;
  } catch (err) {
    console.error(`Fehler beim Laden des Wikipedia-Bilds für ${wikiLang}:${articleTitle}:`, err);
    return null;
  }
}
