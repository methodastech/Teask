/**
 * Writes api/seed/posts.json from the articles in src/lib/posts.ts, so the
 * nine seeded pieces can be imported into the database once and then edited
 * from the studio like anything else.
 *
 * Run:  npm run seed:export
 *
 * posts.ts is TypeScript, so it is transpiled with the esbuild that ships
 * inside Vite rather than being parsed by hand. It imports the CMS store,
 * which checks for `window` and returns [] under Node, so this is safe.
 */

import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const bundle = await build({
  entryPoints: [path.join(root, 'src/lib/posts.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
})

const source = Buffer.from(bundle.outputFiles[0].text).toString('base64')
const { POSTS } = await import(`data:text/javascript;base64,${source}`)

const seed = POSTS.map((p) => ({
  kind: p.kind ?? 'article',
  slug: p.slug,
  title: p.title,
  description: p.description,
  category: p.category,
  date: p.date,
  readMinutes: p.readMinutes,
  cover: p.cover,
  coverAlt: p.coverAlt,
  keywords: p.keywords,
  sections: p.sections,
  status: 'published',
}))

const outDir = path.join(root, 'api/seed')
await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, 'posts.json'), JSON.stringify(seed, null, 2) + '\n', 'utf8')

console.log(`Wrote api/seed/posts.json — ${seed.length} posts.`)
