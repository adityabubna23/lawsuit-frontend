#!/usr/bin/env node
/**
 * Machine-translate the English base catalog (src/i18n/locales/en.json) into
 * every offered language using Groq, writing src/i18n/locales/<code>.json.
 *
 * Usage:
 *   GROQ_API_KEY=xxx node scripts/i18n-translate.mjs            # all missing
 *   GROQ_API_KEY=xxx node scripts/i18n-translate.mjs hi ta or   # specific codes
 *   GROQ_API_KEY=xxx node scripts/i18n-translate.mjs --force    # overwrite all
 *
 * ⚠️ Machine translation is fine for UI chrome. LEGAL-CRITICAL strings (consent
 * notices, mediation text, OTP/credential emails, ToS) MUST get human legal
 * review before production — wrong legal copy is a compliance risk, not a typo.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES = path.resolve(__dirname, '../src/i18n/locales')
const EN = JSON.parse(fs.readFileSync(path.join(LOCALES, 'en.json'), 'utf8'))

// Mirror src/i18n/languages.ts (kept inline so the script has no app imports).
const LANGUAGES = [
  ['hi', 'Hindi'], ['bn', 'Bengali'], ['te', 'Telugu'], ['mr', 'Marathi'], ['ta', 'Tamil'],
  ['ur', 'Urdu'], ['gu', 'Gujarati'], ['kn', 'Kannada'], ['or', 'Odia'], ['ml', 'Malayalam'],
  ['pa', 'Punjabi'], ['as', 'Assamese'], ['mai', 'Maithili'], ['sat', 'Santali'], ['ks', 'Kashmiri'],
  ['ne', 'Nepali'], ['sd', 'Sindhi'], ['kok', 'Konkani'], ['doi', 'Dogri'], ['mni', 'Manipuri'],
  ['brx', 'Bodo'], ['sa', 'Sanskrit'],
]

const API_KEY = process.env.GROQ_API_KEY
const MODEL = process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile'
if (!API_KEY) { console.error('Set GROQ_API_KEY'); process.exit(1) }

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))
const targets = LANGUAGES.filter(([code]) => (only.length ? only.includes(code) : true))

async function translate(name, json) {
  const prompt =
    `Translate the VALUES of this JSON object into ${name} for a legal-services app UI. ` +
    `Keep all keys and structure identical. Do not translate placeholders like {{name}} or "AI". ` +
    `Return ONLY valid JSON, no markdown.\n\n${JSON.stringify(json, null, 2)}`
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

for (const [code, name] of targets) {
  const out = path.join(LOCALES, `${code}.json`)
  if (fs.existsSync(out) && !force) { console.log(`skip ${code} (exists)`); continue }
  try {
    process.stdout.write(`translating ${name} (${code})… `)
    const translated = await translate(name, EN)
    fs.writeFileSync(out, JSON.stringify(translated, null, 2) + '\n', 'utf8')
    console.log('done')
  } catch (e) {
    console.error(`FAILED ${code}:`, e.message)
  }
}
console.log('\nReview legal-critical strings before shipping.')
