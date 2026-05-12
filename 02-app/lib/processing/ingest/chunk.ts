import type { SourceType } from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Chunker (INP-12 Phase 1)
//
// Deterministic, no-LLM splitting of a source's extracted_text into semantic
// chunks. Strategy dispatches on `sourceType`:
//
//   transcript family (client-interview, coaching-call, peer-conversation,
//     supplier-conversation, accountability-checkin, meeting-notes)
//       → speaker-turn chunks. `speaker` populated.
//   internal-notes, content-idea
//       → paragraph chunks (double-newline split, short-fragment merge).
//   research-document, report
//       → paragraph chunks with metadata.sectionHeading carrying the nearest
//         preceding markdown heading.
//   pitch-deck
//       → slide chunks. metadata.slideNumber + metadata.slideTitle populated.
//         Slide boundaries assume "Slide N:" / "## Slide N" / form-feed (\f)
//         or three-or-more-dashes "---" separators on their own line.
//   dataset, collection
//       → no chunks (handled by SKL-12 / SourceItem ingestion separately).
//
// Each chunk carries position (0-based), text (verbatim), optional speaker,
// optional startOffset/endOffset into the parent extracted_text, and
// chunk-type-specific metadata.
//
// Pure function — no DB, no LLM. Same input → same output. Per
// src-source-chunks.md "The chunker is deterministic".
// ---------------------------------------------------------------------------

export type ChunkType = 'speaker-turn' | 'paragraph' | 'section' | 'slide' | 'row' | 'item'

export interface ChunkInput {
  sourceType: SourceType
  extractedText: string
}

export interface Chunk {
  position: number
  chunkType: ChunkType
  text: string
  speaker: string | null
  startOffset: number | null
  endOffset: number | null
  tokenCount: number | null
  metadata: Record<string, unknown>
}

const TRANSCRIPT_SOURCE_TYPES: SourceType[] = [
  'client-interview',
  'coaching-call',
  'peer-conversation',
  'supplier-conversation',
  'accountability-checkin',
  'meeting-notes',
]

const PARAGRAPH_SOURCE_TYPES: SourceType[] = ['internal-notes', 'content-idea']

const STRUCTURED_DOC_SOURCE_TYPES: SourceType[] = ['research-document', 'report']

const NON_CHUNKED_SOURCE_TYPES: SourceType[] = ['dataset', 'collection']

/** Approximate token count: 1 token ≈ 4 chars (OpenAI rule of thumb). */
function approximateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

/** Minimum chars for a paragraph chunk to stand on its own; below this it
 *  merges into the previous chunk. Prevents single-line fragments. */
const MIN_PARAGRAPH_CHARS = 40

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function chunkSource(input: ChunkInput): Chunk[] {
  const { sourceType, extractedText } = input
  if (!extractedText || !extractedText.trim()) return []

  if (NON_CHUNKED_SOURCE_TYPES.includes(sourceType)) return []

  if (TRANSCRIPT_SOURCE_TYPES.includes(sourceType)) {
    return chunkBySpeakerTurn(extractedText)
  }

  if (sourceType === 'pitch-deck') {
    return chunkBySlide(extractedText)
  }

  if (STRUCTURED_DOC_SOURCE_TYPES.includes(sourceType)) {
    return chunkByParagraphWithHeadings(extractedText)
  }

  if (PARAGRAPH_SOURCE_TYPES.includes(sourceType)) {
    return chunkByParagraph(extractedText)
  }

  // Default: paragraph chunking. Keeps the system safe under new source types
  // that haven't been hand-tuned yet.
  return chunkByParagraph(extractedText)
}

// ---------------------------------------------------------------------------
// Strategy: speaker-turn (transcripts)
// ---------------------------------------------------------------------------
//
// Recognises a speaker line that starts a turn. Supported markers:
//
//   "Speaker Name:"             — colon-terminated name at line start (most Krisp transcripts)
//   "Speaker Name (00:01:23):"  — Krisp variant with timestamps
//   "[Speaker Name] "           — bracketed name (some transcription tools)
//   "**Speaker Name**: "        — markdown-bold name (some Google Docs paste)
//
// A speaker line begins a new turn. Lines after it belong to that turn until
// the next speaker line. Multi-line turns are joined with a single space.
//
// Conservative speaker-line detection: the name must be 1–6 words, made of
// letters/spaces/`.`/`-`/`'`/`’`, and the marker must end with `: ` or `:`
// followed by a newline. This avoids accidentally splitting on sentences like
// "I said: I'm not sure." inside a turn.
// ---------------------------------------------------------------------------

const SPEAKER_LINE_RX =
  /^(?:\*\*([A-Za-z][A-Za-z .\-''’]{0,80})\*\*|\[([A-Za-z][A-Za-z .\-''’]{0,80})\]|([A-Za-z][A-Za-z .\-''’]{0,80}))\s*(?:\(\d{1,2}:\d{2}(?::\d{2})?\))?\s*:\s*/

function chunkBySpeakerTurn(text: string): Chunk[] {
  const lines = text.split(/\r?\n/)
  const turns: Array<{ speaker: string; lines: string[]; startLineIdx: number }> = []
  let current: { speaker: string; lines: string[]; startLineIdx: number } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      // Blank line just terminates whatever is being collected — but we keep
      // accumulating into the current turn (blanks between paragraphs of one
      // speaker happen often).
      continue
    }

    const m = line.match(SPEAKER_LINE_RX)
    if (m && isLikelySpeakerName(m[1] ?? m[2] ?? m[3] ?? '')) {
      // Close out previous turn, start new one
      if (current) turns.push(current)
      const speaker = (m[1] ?? m[2] ?? m[3] ?? '').trim()
      const rest = line.slice(m[0].length).trim()
      current = { speaker, lines: rest ? [rest] : [], startLineIdx: i }
    } else if (current) {
      current.lines.push(line.trim())
    } else {
      // Pre-amble text before any speaker line. Treat as a paragraph-style
      // unattributed turn so it isn't lost.
      current = { speaker: '', lines: [line.trim()], startLineIdx: i }
    }
  }
  if (current) turns.push(current)

  // If no speaker turns were detected, fall back to paragraph chunking. This
  // happens when a transcript isn't actually formatted with speaker labels
  // (e.g. a Krisp export with stripped names).
  if (turns.length === 0 || turns.every((t) => !t.speaker)) {
    return chunkByParagraph(text)
  }

  const chunks: Chunk[] = []
  let cursor = 0
  let position = 0
  for (const turn of turns) {
    const turnText = turn.lines.join(' ').replace(/\s+/g, ' ').trim()
    if (!turnText) continue

    // Find the turn text in the source for offset tracking. We use indexOf
    // from `cursor` so repeated phrases match in order. If we can't find an
    // exact substring (whitespace got collapsed), we leave offsets null.
    const startOffset = findApproxOffset(text, turnText, cursor)
    const endOffset = startOffset === null ? null : startOffset + turnText.length
    if (startOffset !== null) cursor = endOffset!

    chunks.push({
      position: position++,
      chunkType: 'speaker-turn',
      text: turnText,
      speaker: turn.speaker || null,
      startOffset,
      endOffset,
      tokenCount: approximateTokenCount(turnText),
      metadata: {},
    })
  }

  return chunks
}

/** A handful of guards against false-positive speaker matches. */
function isLikelySpeakerName(candidate: string): boolean {
  const c = candidate.trim()
  if (!c) return false
  // Speaker names are short — typically 1–6 tokens.
  const words = c.split(/\s+/)
  if (words.length > 6) return false
  // Avoid matching lines that look like quoted speech ("I said: ...") — those
  // tend to start with a verb or pronoun rather than a Capitalised Name.
  // Heuristic: at least the first word must start with an uppercase letter.
  if (!/^[A-Z]/.test(words[0])) return false
  // Filter obvious non-names (common sentence starters that capitalise).
  const lowerFirst = words[0].toLowerCase()
  const blockedFirsts = new Set([
    'note',
    'aside',
    'caveat',
    'context',
    'reminder',
    'todo',
    'tip',
    'warning',
  ])
  if (blockedFirsts.has(lowerFirst)) return false
  return true
}

// ---------------------------------------------------------------------------
// Strategy: paragraph (internal-notes, content-idea, fallback)
// ---------------------------------------------------------------------------

function chunkByParagraph(text: string): Chunk[] {
  const paragraphs = splitParagraphs(text)
  return paragraphs.map((p, idx) => ({
    position: idx,
    chunkType: 'paragraph' as const,
    text: p.text,
    speaker: null,
    startOffset: p.startOffset,
    endOffset: p.endOffset,
    tokenCount: approximateTokenCount(p.text),
    metadata: {},
  }))
}

// ---------------------------------------------------------------------------
// Strategy: paragraph + nearest heading (research-document, report)
// ---------------------------------------------------------------------------

function chunkByParagraphWithHeadings(text: string): Chunk[] {
  // Headings split paragraphs in this strategy — we don't want a short-paragraph
  // merge to swallow the next heading, so we pass `mergeShort: false`. A heading
  // becomes its own `section` chunk and updates the running heading-context
  // metadata for all paragraphs that follow.
  const paragraphs = splitParagraphs(text, { mergeShort: false })
  let currentHeading: string | null = null
  const chunks: Chunk[] = []

  for (const p of paragraphs) {
    const headingMatch = detectHeading(p.text)
    if (headingMatch) {
      currentHeading = headingMatch
      chunks.push({
        position: chunks.length,
        chunkType: 'section',
        text: p.text,
        speaker: null,
        startOffset: p.startOffset,
        endOffset: p.endOffset,
        tokenCount: approximateTokenCount(p.text),
        metadata: { sectionHeading: currentHeading, isHeading: true },
      })
      continue
    }

    const metadata: Record<string, unknown> = {}
    if (currentHeading) metadata.sectionHeading = currentHeading

    chunks.push({
      position: chunks.length,
      chunkType: 'paragraph',
      text: p.text,
      speaker: null,
      startOffset: p.startOffset,
      endOffset: p.endOffset,
      tokenCount: approximateTokenCount(p.text),
      metadata,
    })
  }

  return chunks
}

const ATX_HEADING_RX = /^#{1,6}\s+(.+?)\s*#*\s*$/
const NUMBERED_HEADING_RX = /^(\d+(?:\.\d+)*\.?\s+)?([A-Z][A-Za-z][^.!?]{2,80})$/

function detectHeading(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const atx = trimmed.match(ATX_HEADING_RX)
  if (atx) return atx[1].trim()
  // Numbered-heading detection is intentionally narrow: single-line, no
  // sentence-terminator, starts with a capital, optionally prefixed with a
  // numeric section marker (`1.`, `1.1`, `2.3.4 `).
  if (trimmed.length <= 100 && !trimmed.includes('\n')) {
    const num = trimmed.match(NUMBERED_HEADING_RX)
    if (num) return num[2].trim()
  }
  return null
}

// ---------------------------------------------------------------------------
// Strategy: slide (pitch-deck)
// ---------------------------------------------------------------------------

/** Match `Slide N:` / `## Slide N — title` / leading `## ` / form-feed.
 *  Returns null if the line isn't a slide boundary. */
const SLIDE_HEADER_RX =
  /^(?:#{1,3}\s+)?slide\s+(\d+)\s*(?:[—–\-:]\s*(.+))?$/i

const ALT_SLIDE_HEADER_RX = /^#{1,3}\s+(.+)$/

function chunkBySlide(text: string): Chunk[] {
  // Split on form-feed first (some PDF→text converters emit \f between pages)
  // and on lines that match a slide-header pattern. We retain the slide
  // header text inside the chunk so the title is visible in the text body
  // (helpful for retrieval).

  const lines = text.split(/\r?\n/)
  type SlideBuilder = {
    slideNumber: number | null
    slideTitle: string | null
    lines: string[]
    startLineIdx: number
  }
  const slides: SlideBuilder[] = []
  let current: SlideBuilder | null = null

  // If the document uses form-feed, prefer that as the canonical boundary.
  const hasFormFeed = text.includes('\f')

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (hasFormFeed && rawLine.includes('\f')) {
      // form-feed boundary: each chunk of the form-feed-split block starts a slide.
      if (current) slides.push(current)
      // The line may contain residual text before/after \f — we treat the
      // text on either side as belonging to the new slide.
      current = {
        slideNumber: slides.length + 1,
        slideTitle: null,
        lines: [rawLine.replace(/\f/g, ' ').trim()].filter(Boolean),
        startLineIdx: i,
      }
      continue
    }

    const slideMatch = line.match(SLIDE_HEADER_RX)
    if (slideMatch) {
      if (current) slides.push(current)
      current = {
        slideNumber: parseInt(slideMatch[1], 10),
        slideTitle: slideMatch[2]?.trim() ?? null,
        lines: [],
        startLineIdx: i,
      }
      continue
    }

    // If we haven't started a slide yet and we hit a markdown heading, treat
    // it as slide 1's title. After that, ATX headings inside a slide are
    // ordinary content.
    if (!current && !slides.length) {
      const altMatch = line.match(ALT_SLIDE_HEADER_RX)
      if (altMatch) {
        current = {
          slideNumber: 1,
          slideTitle: altMatch[1].trim(),
          lines: [],
          startLineIdx: i,
        }
        continue
      }
    }

    if (!line) continue
    if (!current) {
      current = {
        slideNumber: slides.length + 1,
        slideTitle: null,
        lines: [line],
        startLineIdx: i,
      }
    } else {
      current.lines.push(line)
    }
  }
  if (current) slides.push(current)

  // If we found no slide-boundary signal at all, fall back to paragraph
  // chunking — pitch deck text we can't slice safely is still better as
  // paragraphs than as one giant chunk.
  if (slides.length <= 1) return chunkByParagraph(text)

  const out: Chunk[] = []
  slides.forEach((s, idx) => {
    const body = s.lines.join('\n').replace(/[ \t]+\n/g, '\n').trim()
    if (!body) return
    const startOffset = findApproxOffset(text, body, 0)
    const endOffset = startOffset === null ? null : startOffset + body.length
    out.push({
      position: idx,
      chunkType: 'slide',
      text: body,
      speaker: null,
      startOffset,
      endOffset,
      tokenCount: approximateTokenCount(body),
      metadata: {
        slideNumber: s.slideNumber ?? idx + 1,
        slideTitle: s.slideTitle ?? null,
      },
    })
  })
  return out
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface ParagraphWindow {
  text: string
  startOffset: number | null
  endOffset: number | null
}

/** Split text into paragraphs on double-newline. When `mergeShort` is true
 *  (the default), fragments shorter than MIN_PARAGRAPH_CHARS are joined onto
 *  the previous paragraph — prevents single-line orphan chunks. Headed
 *  strategies opt out so headings never merge into adjacent prose. */
function splitParagraphs(text: string, options: { mergeShort?: boolean } = {}): ParagraphWindow[] {
  const mergeShort = options.mergeShort ?? true
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalised.split(/\n{2,}/)

  const windows: ParagraphWindow[] = []
  let searchFrom = 0

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    const startOffset = normalised.indexOf(trimmed, searchFrom)
    const endOffset = startOffset === -1 ? null : startOffset + trimmed.length
    if (startOffset !== -1) searchFrom = endOffset!

    if (mergeShort && windows.length > 0 && trimmed.length < MIN_PARAGRAPH_CHARS) {
      const last = windows[windows.length - 1]
      last.text = `${last.text}\n\n${trimmed}`
      if (endOffset !== null) last.endOffset = endOffset
      continue
    }

    windows.push({
      text: trimmed,
      startOffset: startOffset === -1 ? null : startOffset,
      endOffset,
    })
  }

  return windows
}

/** Best-effort offset lookup: tries exact substring first, then a normalised
 *  whitespace-collapsed search. Returns null if neither finds the text. */
function findApproxOffset(haystack: string, needle: string, fromIndex: number): number | null {
  if (!needle) return null
  const direct = haystack.indexOf(needle, fromIndex)
  if (direct !== -1) return direct

  // Fallback: collapse whitespace on both sides and find the first match.
  // We can't return a meaningful offset from a collapsed version, so we only
  // confirm presence and return null offset — keeps the chunk row insertable
  // without lying about offsets.
  const collapsedHay = haystack.slice(fromIndex).replace(/\s+/g, ' ')
  const collapsedNeedle = needle.replace(/\s+/g, ' ')
  if (collapsedHay.includes(collapsedNeedle)) return null
  return null
}
