// src/lib/getStaticPathsHelper.js
import { loadCsv } from './loadCsv.js';

export function getStaticPathsForCsv(csvPath, idField) {
  const data = loadCsv(csvPath);
  return data
    .filter((row) => row[idField] && row[idField].trim() !== '')
    .map((row) => ({
      params: { id: row[idField] },
    }));
}
