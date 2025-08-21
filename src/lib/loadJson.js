// src/lib/loadJson.js
import fs from 'fs/promises'
import path from 'path'

export default async function loadJson(relPath) {
  const projectRoot = process.cwd()
  const safeRel = relPath.replace(/^\/+/, '') // '/data/…' -> 'data/…'
  const absPath = path.join(projectRoot, safeRel)
  const data = await fs.readFile(absPath, 'utf8')
  return JSON.parse(data)
}
