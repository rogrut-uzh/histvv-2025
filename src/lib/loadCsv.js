import Papa from 'papaparse';
import fs from 'fs';

export function loadCsv(filePath) {
  const actualPath = filePath.startsWith('/data')
    ? `/app${filePath}`
    : filePath;

  const csvData = fs.readFileSync(actualPath, { encoding: 'utf8'});
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    delimiter: '~',
  });
  return parsed.data;
}