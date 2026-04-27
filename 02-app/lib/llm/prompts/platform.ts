/**
 * Platform strategy generation prompt.
 * Follows the GEN-PROMPTS-01 pattern established by audience-segment.ts.
 * Generates a complete platform strategy record from minimal user inputs + business context.
 */

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const PLATFORM_GENERATION_SYSTEM_PROMPT = `***YOUR ROLE***
You're an expert digital strategist and content strategist with deep expertise in platform-specific content strategy across social media, newsletters, podcasts, video, and owned content channels.

***YOUR TASK***
You're helping a business owner create a comprehensive platform strategy for a specific channel. You will be given information about the business, its value proposition, existing audience segments, and the user's inputs about this platform. Your job is to produce a complete, structured platform strategy that serves as both a strategic reference and an operational guide for content creation on this platform.

***IMPORTANT BRIEFING***
The strategy must include:
1. Strategic positioning — why this platform, for whom, and what role it plays
2. Content formats — what types of content to create, with structural rules
3. Subtopic ideas — specific content themes with example post/episode/article ideas
4. Structure and features — recurring editorial elements that build brand recognition
5. Constraints — what to avoid and what limits apply
6. Analytics goals — what success looks like

---

**PLATFORM-SPECIFIC THINKING**

The strategy must be tailored to the specific platform type. A LinkedIn strategy is fundamentally different from a podcast strategy or a newsletter strategy. Consider:

- **Social platforms** (LinkedIn, X, Instagram): character limits, algorithm behaviour, engagement patterns, hashtag conventions, posting cadence, content format mix
- **Email/newsletter** (Substack, ConvertKit): subject line strategy, send frequency, content length, CTA placement, list growth, open/click targets
- **Audio** (podcast): episode format, length, frequency, show structure, guest strategy, distribution, listener engagement
- **Video** (YouTube, TikTok): thumbnail strategy, hook timing, retention patterns, SEO, format mix (long/short), production expectations
- **Owned content** (blog, website): SEO, content depth, update cadence, internal linking, conversion paths

Do NOT produce generic advice that could apply to any platform. Every field must reflect the specific constraints and opportunities of the named platform.

---

**CONTENT FORMATS**

For each format, provide:
- A clear name (e.g. "Text post", "Carousel", "Solo episode", "Deep dive article")
- A description of how it works on this platform — structure, length, visual requirements
- Character or duration limit (if applicable)
- What it's best for (e.g. "thought leadership", "frameworks", "storytelling")
- Recommended frequency

Generate at least 2 formats, more if the platform supports diverse content types.

---

**SUBTOPIC IDEAS**

Generate content theme clusters grounded in the business's actual expertise and positioning. Each cluster should have:
- A subtopic name that reflects a genuine angle or theme
- 2-4 specific content ideas (titles, hooks, or angles — not vague topics)

These should be ideas that only this business could credibly write/produce, not generic industry content.

---

**STRUCTURE AND FEATURES**

Every strong platform presence has recurring editorial elements that build recognition. Generate:
- At least 1 signature feature (a recurring format or editorial choice that becomes associated with this brand)
- A content structure template (e.g. "Hook → Setup → Insight → CTA")
- Branded components — stylistic elements that appear consistently

---

**DO NOT DO**

Platform-specific anti-patterns. What should this brand avoid on this platform? Be specific — "don't post too much" is useless; "don't use more than 3 hashtags — algorithm deprioritises hashtag-heavy posts" is useful.

---

**CUSTOMER JOURNEY STAGE**

Identify which stage this platform primarily serves:
- **awareness**: Reaching new audiences, building visibility
- **engagement**: Deepening relationships, building trust and authority
- **conversion**: Driving specific actions — signups, purchases, consultations
- **delight_advocacy**: Serving existing clients/customers, building referral and loyalty

Most platforms have a primary stage even if they touch multiple stages.

---

**SOURCE DOCUMENTS**

Where source documents are provided, use them as the primary authority. Extract and preserve specific details, terminology, and nuance from the source material. Do not generalise away specifics — if a source doc says "we post 3x per week and get 5% engagement on text posts", preserve those numbers and specifics in the strategy.

---

**LANGUAGE AND TONE**

Write in a direct, strategic voice. This is an operational document, not a pitch. Be specific and prescriptive — the content creator will use this to generate actual content, so vague guidance is worse than no guidance.`

// ---------------------------------------------------------------------------
// Evaluation prompt
// ---------------------------------------------------------------------------

export const PLATFORM_EVALUATION_SYSTEM_PROMPT = `You are evaluating whether you have enough context to generate a high-quality platform strategy for a content strategist.

You will receive:
- The platform name and type (e.g. "LinkedIn", social)
- Optionally: what the platform is for (primary objective) and who the audience is
- Business context (what the business does, value proposition, existing audience segments)

Decide whether you can generate a specific, grounded, non-generic platform strategy from this information. If you need more context, ask 1-2 targeted follow-up questions.

Rules:
- Maximum 2 follow-up questions
- Only ask questions that would materially improve the output
- If you have the platform name + type + business context + at least a primary objective, you almost certainly have enough
- If the primary objective is missing but the platform type is clear and you have good business context, that's probably enough
- Questions should be about the platform strategy, not about the business (you already have business context)
- Good follow-up questions: "What's working/not working on this platform currently?", "Any specific formats you already use?", "What's your current posting frequency?"
- Frame questions conversationally, not clinically`

// ---------------------------------------------------------------------------
// User message builders
// ---------------------------------------------------------------------------

interface BusinessContext {
  businessName?: string
  vertical?: string
  specialism?: string
  businessModel?: string
  shortDescription?: string
  fullDescription?: string
}

interface ValuePropContext {
  coreStatement?: string
  problemSolved?: string
  uniqueMechanism?: string
  differentiators?: string[]
}

interface ExistingSegment {
  segmentName: string
  personaName: string | null
  summary: string | null
}

interface ExistingPlatform {
  name: string
  category: string
  channel: string
  primaryObjective: string | null
}

export interface PlatformPromptInput {
  name: string
  category: string
  channel: string
  handle?: string
  primaryObjective?: string
  audience?: string
  followUpAnswers?: { question: string; answer: string }[]
  sourceDocTexts?: string[]
}

export interface PlatformPromptContext {
  business: BusinessContext | null
  valueProp: ValuePropContext | null
  existingSegments: ExistingSegment[]
  existingPlatforms: ExistingPlatform[]
}

export function buildPlatformGenerationUserMessage(
  input: PlatformPromptInput,
  context: PlatformPromptContext
): string {
  const sections: string[] = []

  // Business context
  if (context.business) {
    const b = context.business
    const parts: string[] = []
    if (b.businessName) parts.push(`Business: ${b.businessName}`)
    if (b.vertical) parts.push(`Field: ${b.vertical}`)
    if (b.specialism) parts.push(`Specialisation: ${b.specialism}`)
    if (b.businessModel) parts.push(`Model: ${b.businessModel}`)
    if (b.fullDescription) parts.push(`Description: ${b.fullDescription}`)
    else if (b.shortDescription) parts.push(`Description: ${b.shortDescription}`)

    if (parts.length > 0) {
      sections.push(`## Business Context\n${parts.join('\n')}`)
    }
  }

  // Value proposition context
  if (context.valueProp) {
    const v = context.valueProp
    const parts: string[] = []
    if (v.coreStatement) parts.push(`Core statement: ${v.coreStatement}`)
    if (v.problemSolved) parts.push(`Problem solved: ${v.problemSolved}`)
    if (v.uniqueMechanism) parts.push(`Unique mechanism: ${v.uniqueMechanism}`)
    if (v.differentiators?.length) parts.push(`Differentiators: ${v.differentiators.join('; ')}`)

    if (parts.length > 0) {
      sections.push(`## Value Proposition\n${parts.join('\n')}`)
    }
  }

  // Existing audience segments
  if (context.existingSegments.length > 0) {
    const segList = context.existingSegments
      .map(s => `- **${s.segmentName}**: ${s.summary || '(no summary)'}`)
      .join('\n')
    sections.push(`## Audience Segments\n${segList}`)
  }

  // Existing channels (for differentiation)
  if (context.existingPlatforms.length > 0) {
    const platList = context.existingPlatforms
      .map(p => `- **${p.name}** (${p.category} / ${p.channel}): ${p.primaryObjective || '(no objective set)'}`)
      .join('\n')
    sections.push(
      `## Existing Channels\nThe following channels already have strategies. The strategy you create should complement these — avoid duplicating the same role.\n${platList}`
    )
  }

  // Channel to generate
  sections.push(`## Channel to Generate\n**Channel name:** ${input.name}\n**Category:** ${input.category}\n**Channel:** ${input.channel}`)

  if (input.handle) {
    sections.push(`**Handle/URL:** ${input.handle}`)
  }

  if (input.primaryObjective) {
    sections.push(`**What this channel is for:** ${input.primaryObjective}`)
  }

  if (input.audience) {
    sections.push(`**Audience on this channel:** ${input.audience}`)
  }

  // Source documents
  if (input.sourceDocTexts?.length) {
    const docSections = input.sourceDocTexts.map((text, i) => {
      // Truncate very long documents to avoid context overflow
      const truncated = text.length > 15000 ? text.slice(0, 15000) + '\n\n[... truncated]' : text
      return `### Source Document ${i + 1}\n${truncated}`
    }).join('\n\n')
    sections.push(`## Source Documents\nThe following documents describe this channel's strategy. Use them as primary authority — extract and preserve specific details, terminology, and nuance.\n\n${docSections}`)
  }

  // Follow-up answers
  if (input.followUpAnswers?.length) {
    const qa = input.followUpAnswers
      .map(a => `Q: ${a.question}\nA: ${a.answer}`)
      .join('\n\n')
    sections.push(`## Additional Context\n${qa}`)
  }

  return sections.join('\n\n')
}

export function buildPlatformEvaluationUserMessage(
  input: PlatformPromptInput,
  context: PlatformPromptContext
): string {
  const sections: string[] = []

  if (context.business) {
    const b = context.business
    sections.push(`Business: ${b.businessName || ''} — ${b.vertical || ''}, ${b.specialism || ''}`)
  }

  sections.push(`Channel: ${input.name} (${input.category} / ${input.channel})`)

  if (input.primaryObjective) {
    sections.push(`Primary objective: ${input.primaryObjective}`)
  }
  if (input.audience) {
    sections.push(`Audience: ${input.audience}`)
  }
  if (input.sourceDocTexts?.length) {
    sections.push(`Source documents provided: ${input.sourceDocTexts.length} (will be included in full at generation time)`)
  }

  return sections.join('\n')
}
