/**
 * DNA-09 + GEN-PROMPTS-01: Generate tone of voice from writing samples.
 *
 * Reads all current samples from dna_tov_samples, sends them to Claude
 * with a structured generation prompt, and inserts/updates the base
 * dna_tone_of_voice record.
 *
 * Usage: node scripts/generate-tov.mjs
 * Re-runnable: upserts the ToV record (creates if missing, updates if exists).
 */

import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

// Load env
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) process.env[match[1]] = match[2].trim()
}

const sql = neon(process.env.DATABASE_URL)

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

// --- Load samples from DB ---

async function loadSamples() {
  const rows = await sql`
    SELECT format_type, subtype, body, notes, source_context
    FROM dna_tov_samples
    WHERE brand_id = ${BRAND_ID} AND is_current = true
    ORDER BY format_type, created_at
  `
  return rows
}

// --- Build the generation prompt ---

function buildSystemPrompt() {
  return `You are a tone of voice analyst. You will receive writing samples from a single author across one or more formats (blog, social media, email, sales copy, spoken transcripts). Your job is to analyse these samples and produce a structured tone of voice profile.

## Tonal dimensions

There are four tonal dimensions, each scored 0–100:

**Humour** (0 = serious, 100 = full-bore funny)
Does the writing use humour? What kind — witty, dry, silly, acerbic, absurd, observational, playful? How pervasive is it? Score based on the degree and type of humour present.

**Reverence** (0 = highly reverent, 100 = extremely irreverent)
How does the writing treat its subjects and readers? Reverent writing is earnest and respectful. Irreverent writing is tongue-in-cheek, subversive, willing to poke fun at institutions or conventions.

**Formality** (0 = traditionally formal, 100 = extremely casual)
How formal is the register? Consider: contractions, slang, sentence complexity, vocabulary register, distance from or closeness to the reader.

**Enthusiasm** (0 = unenthusiastic, 100 = maximum enthusiasm)
How much energy does the writing convey? Unenthusiastic writing is matter-of-fact. Enthusiastic writing brings visible energy and engagement. Consider exclamation marks, amplifying language, sentence length and rhythm.

## What to produce

For each dimension, provide:
- A score (integer, 0–100)
- A 1–3 sentence description of how that dimension manifests in this voice. Write the description in the author's own voice — it should sound like them, not like a style guide. Include "tonal target words" (what the voice IS) and "anti-tonal words" (what it is NOT).

Also produce:
- **summary**: A 2–3 paragraph tone of voice guideline, written in the author's own voice (first person). This should capture how the voice feels, what makes it distinctive, and how it approaches communication. It should read like a good bio that happens to be about how you write rather than what you do.
- **linguisticNotes**: Specific observations about lexical choices, sentence structure, rhythm, cadence, dialect, figurative language, and any stylistic idiosyncrasies.
- **emotionalResonance**: How persuasive, educational, and emotive elements are incorporated. What emotions does this writing evoke and how?
- **brandVocabulary**: Three lists — "preferred" (words/phrases this voice gravitates toward), "avoid" (words/phrases that would sound wrong in this voice), and "notes" (brief guidance on vocabulary choices).
- **language**: The BCP 47 language tag (e.g. "en-GB", "en-US").
- **grammaticalPerson**: "first_singular", "first_plural", or "second" — which person does this voice primarily use?

## Output format

Respond with ONLY a JSON object matching this exact structure. No markdown, no code fences, no explanation — just the JSON.

{
  "dimensions": {
    "humour": { "score": <0-100>, "description": "<1-3 sentences>" },
    "reverence": { "score": <0-100>, "description": "<1-3 sentences>" },
    "formality": { "score": <0-100>, "description": "<1-3 sentences>" },
    "enthusiasm": { "score": <0-100>, "description": "<1-3 sentences>" }
  },
  "summary": "<2-3 paragraphs>",
  "linguisticNotes": "<paragraph>",
  "emotionalResonance": "<paragraph>",
  "brandVocabulary": {
    "preferred": ["<word>", ...],
    "avoid": ["<word>", ...],
    "notes": "<brief guidance>"
  },
  "language": "<BCP 47 tag>",
  "grammaticalPerson": "<first_singular|first_plural|second>"
}`
}

function buildUserPrompt(samples) {
  const grouped = {}
  for (const s of samples) {
    const key = s.format_type
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }

  const parts = []
  for (const [formatType, formatSamples] of Object.entries(grouped)) {
    parts.push(`\n=== ${formatType.toUpperCase()} SAMPLES ===\n`)
    for (const s of formatSamples) {
      parts.push(`--- ${s.subtype || formatType} (${s.source_context || 'no context'}) ---`)
      parts.push(s.body)
      if (s.notes) parts.push(`[Analyst note: ${s.notes}]`)
      parts.push('')
    }
  }

  return `Analyse the following writing samples and produce a structured tone of voice profile.\n${parts.join('\n')}`
}

// --- Run generation ---

async function main() {
  console.log('Loading writing samples...')
  const samples = await loadSamples()

  if (samples.length === 0) {
    console.error('No samples found. Run seed-tov-samples.mjs first.')
    process.exit(1)
  }

  const formatCounts = {}
  for (const s of samples) {
    formatCounts[s.format_type] = (formatCounts[s.format_type] || 0) + 1
  }
  console.log(`Found ${samples.length} samples:`, formatCounts)

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(samples)

  console.log(`\nPrompt size: system=${systemPrompt.length} chars, user=${userPrompt.length} chars`)
  console.log('Generating tone of voice profile...')

  const t0 = Date.now()

  // Use Gemini 3.1 Pro — standard fallback for generation/analysis when Anthropic unavailable
  const geminiModel = 'gemini-3.1-pro-preview'
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`

  console.log(`Calling ${geminiModel}...`)

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error(`API error ${response.status}:`, err)
    process.exit(1)
  }

  const data = await response.json()
  const elapsed = Date.now() - t0
  console.log(`LLM call took ${elapsed}ms`)

  // Extract text content from Gemini response
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textContent) {
    console.error('No text response from LLM')
    console.error(JSON.stringify(data, null, 2).substring(0, 500))
    process.exit(1)
  }
  const textBlock = { text: textContent }

  // Parse JSON (strip any markdown fences if present)
  let jsonStr = textBlock.text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  let result
  try {
    result = JSON.parse(jsonStr)
  } catch (err) {
    console.error('Failed to parse LLM output as JSON:')
    console.error(jsonStr.substring(0, 500))
    process.exit(1)
  }

  // Pretty-print for review
  console.log('\n' + '='.repeat(60))
  console.log('GENERATED TONE OF VOICE')
  console.log('='.repeat(60))

  console.log('\n📊 DIMENSIONS:')
  for (const [dim, val] of Object.entries(result.dimensions)) {
    console.log(`  ${dim}: ${val.score}/100`)
    console.log(`    ${val.description}`)
  }

  console.log('\n📝 SUMMARY:')
  console.log(result.summary)

  console.log('\n🔤 LINGUISTIC NOTES:')
  console.log(result.linguisticNotes)

  console.log('\n💭 EMOTIONAL RESONANCE:')
  console.log(result.emotionalResonance)

  console.log('\n📖 BRAND VOCABULARY:')
  console.log('  Preferred:', result.brandVocabulary.preferred.join(', '))
  console.log('  Avoid:', result.brandVocabulary.avoid.join(', '))
  console.log('  Notes:', result.brandVocabulary.notes)

  console.log('\n🌐 Language:', result.language)
  console.log('👤 Person:', result.grammaticalPerson)

  // Upsert into dna_tone_of_voice
  console.log('\n--- Saving to database ---')

  const existing = await sql`SELECT id FROM dna_tone_of_voice WHERE brand_id = ${BRAND_ID} LIMIT 1`

  if (existing.length > 0) {
    await sql`
      UPDATE dna_tone_of_voice SET
        dimensions = ${JSON.stringify(result.dimensions)},
        summary = ${result.summary},
        linguistic_notes = ${result.linguisticNotes},
        emotional_resonance = ${result.emotionalResonance},
        brand_vocabulary = ${JSON.stringify(result.brandVocabulary)},
        language = ${result.language},
        grammatical_person = ${result.grammaticalPerson},
        generated_from_samples_at = NOW(),
        updated_at = NOW(),
        version = version + 1
      WHERE brand_id = ${BRAND_ID}
    `
    console.log(`✓ Updated existing ToV record (id: ${existing[0].id})`)
  } else {
    const inserted = await sql`
      INSERT INTO dna_tone_of_voice (
        brand_id, dimensions, summary, linguistic_notes, emotional_resonance,
        brand_vocabulary, language, grammatical_person,
        generated_from_samples_at, status
      ) VALUES (
        ${BRAND_ID}, ${JSON.stringify(result.dimensions)}, ${result.summary},
        ${result.linguisticNotes}, ${result.emotionalResonance},
        ${JSON.stringify(result.brandVocabulary)}, ${result.language},
        ${result.grammaticalPerson}, NOW(), 'draft'
      ) RETURNING id
    `
    console.log(`✓ Created new ToV record (id: ${inserted[0].id})`)
  }

  console.log('\nDone. Review the output above, then edit in the app or re-run to regenerate.')
}

main().catch(err => { console.error(err); process.exit(1) })
