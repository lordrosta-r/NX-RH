// Construit un PDF explicatif du processus à partir des captures + manifeste.
//   node e2e/build-process-pdf.mjs
import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIR = join(__dirname, 'screenshots', 'process')
const OUT = join(__dirname, '..', '..', 'docs', 'Processus-NanoXplore-RH.pdf')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function img64(file) {
  const buf = await readFile(join(DIR, file))
  return `data:image/png;base64,${buf.toString('base64')}`
}

async function main() {
  const manifest = JSON.parse(await readFile(join(DIR, 'manifest.json'), 'utf8'))
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const sections = []
  for (const s of manifest) {
    const src = await img64(s.file)
    sections.push(`
      <section class="step">
        <div class="step-head">
          <span class="num">${esc(s.id)}</span>
          <h2>${esc(s.title)}</h2>
        </div>
        <p class="desc">${esc(s.desc)}</p>
        <div class="shot"><img src="${src}" alt="${esc(s.title)}" /></div>
      </section>`)
  }

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 14mm 14mm 16mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a2e; margin: 0; }
    .cover { height: 268mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
    .brand { color: #b8000b; font-weight: 800; letter-spacing: .5px; font-size: 15px; }
    .cover h1 { font-size: 42px; line-height: 1.1; margin: 14px 0 8px; color: #1b1b78; }
    .cover .sub { font-size: 18px; color: #444; max-width: 80%; }
    .cover .meta { margin-top: 40px; font-size: 13px; color: #777; border-top: 2px solid #1b1b78; padding-top: 14px; width: 60%; }
    .toc { page-break-after: always; }
    .toc h2 { color: #1b1b78; font-size: 22px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
    .toc ol { columns: 2; column-gap: 28px; font-size: 13px; line-height: 1.9; padding-left: 18px; }
    .step { page-break-inside: avoid; page-break-before: always; }
    .step-head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .num { background: #1b1b78; color: #fff; font-weight: 700; font-size: 14px; width: 30px; height: 30px;
           border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .step h2 { font-size: 20px; color: #1b1b78; margin: 0; }
    .desc { font-size: 13.5px; line-height: 1.55; color: #333; margin: 0 0 12px 42px; }
    .shot { border: 1px solid #e3e3ea; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
    .shot img { display: block; width: 100%; }
  </style></head><body>
    <div class="cover">
      <div class="brand">NANOXPLORE RH</div>
      <h1>Le processus,<br/>étape par étape</h1>
      <div class="sub">De la connexion administrateur à l’entretien individuel : le parcours complet de la plateforme d’évaluation et de développement des collaborateurs.</div>
      <div class="meta">Captures réelles de l’application en production locale (HTTPS) — ${manifest.length} étapes.<br/>Généré le ${today}.</div>
    </div>
    <div class="toc">
      <h2>Sommaire</h2>
      <ol>${manifest.map((s) => `<li>${esc(s.title)}</li>`).join('')}</ol>
    </div>
    ${sections.join('')}
  </body></html>`

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.pdf({ path: OUT, format: 'A4', printBackground: true })
  await browser.close()
  console.log(`PDF → ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
