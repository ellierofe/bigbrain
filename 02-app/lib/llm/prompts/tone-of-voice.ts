/**
 * Tone of voice generation prompt.
 * Ported from scripts/generate-tov.mjs to a server-callable form.
 *
 * Generates a structured tone-of-voice profile from writing samples:
 * dimensions (humour, reverence, formality, enthusiasm), summary,
 * linguistic notes, emotional resonance, brand vocabulary, language,
 * grammatical person.
 */

interface SamplePromptInput {
  formatType: string
  subtype: string | null
  body: string
  notes: string | null
  sourceContext: string | null
}

export const TOV_GENERATION_SYSTEM_PROMPT = `You are a tone of voice analyst. You will receive writing samples from a single author across one or more formats (blog, social media, email, sales copy, spoken transcripts). Your job is to analyse these samples and produce a structured tone of voice profile.

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
- **brandVocabulary**: Vocabulary guidance.
  - **overview**: Pattern-level guidance (e.g. "Prefers Anglo-Saxon over Latinate; short over long").
  - **entries**: Specific paired word choices. Each entry has \`use\` (preferred word/phrase), \`avoid\` (the word it replaces), and \`notes\` (brief context — when or why).
- **language**: The BCP 47 language tag (e.g. "en-GB", "en-US").
- **grammaticalPerson**: "first_singular", "first_plural", or "second" — which person does this voice primarily use?`

export function buildTovGenerationUserMessage(samples: SamplePromptInput[]): string {
  const grouped: Record<string, SamplePromptInput[]> = {}
  for (const s of samples) {
    if (!grouped[s.formatType]) grouped[s.formatType] = []
    grouped[s.formatType].push(s)
  }

  const parts: string[] = []
  for (const [formatType, formatSamples] of Object.entries(grouped)) {
    parts.push(`\n=== ${formatType.toUpperCase()} SAMPLES ===\n`)
    for (const s of formatSamples) {
      parts.push(`--- ${s.subtype ?? formatType} (${s.sourceContext ?? 'no context'}) ---`)
      parts.push(s.body)
      if (s.notes) parts.push(`[Analyst note: ${s.notes}]`)
      parts.push('')
    }
  }

  return `Analyse the following writing samples and produce a structured tone of voice profile.\n${parts.join('\n')}`
}

export type { SamplePromptInput as TovSamplePromptInput }
