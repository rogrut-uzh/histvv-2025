import fs from 'fs/promises';
import path from 'path';

export default async function loadJson(relPath) {
  const projectRoot = path.resolve(process.cwd());
  const absPath = path.join(projectRoot, relPath); // relPath z.B. 'data/tbl_dozenten.json'
  const data = await fs.readFile(absPath, 'utf8');
  return JSON.parse(data);
}
