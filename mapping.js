{
  "settings": {
    "index": {
      "max_ngram_diff": 50
    },
    "analysis": {
      "analyzer": {
        "de_analyzer": { "type": "standard", "stopwords": "_german_" },
        "autocomplete": { "tokenizer": "autocomplete", "filter": ["lowercase"] }
      },
      "tokenizer": {
        "autocomplete": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "typ":         { "type": "keyword" },
      "id_semester": { "type": "keyword" },
      "fak":         { "type": "keyword" },

      "site_url":    { "type": "keyword" },
      "url":         { "type": "keyword" },

      "hauptfeld":   { "type": "text", "analyzer": "autocomplete", "search_analyzer": "de_analyzer" },

      "id_veranstaltung": { "type": "keyword" },
      "thema": {
        "type": "text",
        "analyzer": "de_analyzer",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "thema_anmerkung":  { "type": "text", "analyzer": "de_analyzer" },
      "zusatz":           { "type": "text", "analyzer": "de_analyzer" },
      "vorlesungsnummer": { "type": "keyword" },
      "zeit":             { "type": "keyword" },
      "wochenstunden":    { "type": "keyword" },
      "ort":              { "type": "keyword" },
      "dozenten": {
        "type": "object",
        "properties": {
          "id_dozent": { "type": "keyword" },
          "nachname":  { "type": "text", "analyzer": "de_analyzer" },
          "vorname":   { "type": "text", "analyzer": "de_analyzer" },
          "grad":      { "type": "keyword" },
          "funktion":  { "type": "keyword" }
        }
      },

      "id":         { "type": "keyword" },
      "nachname":   { "type": "text", "analyzer": "de_analyzer" },
      "vorname":    { "type": "text", "analyzer": "de_analyzer" },
      "geboren":    { "type": "keyword" },
      "gestorben":  { "type": "keyword" },
      "pnd":        { "type": "keyword" },
      "wikidata":   { "type": "keyword" },
      "wikipedia":  { "type": "keyword" },

      "fachgebiet":   { "type": "text", "analyzer": "de_analyzer" },
      "habilitation": { "type": "text", "analyzer": "de_analyzer" },
      "berufung":     { "type": "text", "analyzer": "de_analyzer" },

      "external_urls": { "type": "keyword" }
    }
  }
}
