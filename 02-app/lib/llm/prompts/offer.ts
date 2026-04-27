/**
 * Offer generation prompts.
 * Three-phase creation: quick form → VOC mapping → interlocutor generation.
 * Separate journey generation prompt for on-demand customer journey creation.
 */

// ---------------------------------------------------------------------------
// Types for prompt context
// ---------------------------------------------------------------------------

export interface OfferPromptInput {
  name: string
  offerType: string
  audienceSegmentName: string
  audienceRoleContext: string
  vocStatements: {
    problems: string[]
    desires: string[]
    objections: string[]
    beliefs: string[]
  }
  followUpAnswers?: { question: string; answer: string }[]
}

export interface OfferPromptContext {
  business: {
    businessName?: string
    vertical?: string
    specialism?: string
    shortDescription?: string
  } | null
  existingOffers: { name: string; offerType: string; overview: string | null }[]
}

export interface JourneyPromptInput {
  offerName: string
  offerType: string
  overview: string
  usp: string
  audienceSegmentName: string
  audienceRoleContext: string
  vocStatements: {
    problems: string[]
    desires: string[]
  }
  outcomeSummary: string
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export const OFFER_GENERATION_SYSTEM_PROMPT = `***YOUR ROLE***
You're an expert offer strategist and copywriter with decades of experience helping service businesses create compelling, well-positioned offers. You understand both the strategic and persuasive elements of offer design.

***YOUR TASK***
You're helping a business owner create a complete offer profile — including positioning (USP), pricing structure, guarantee, and a full set of value-generation elements (outcomes, benefits, advantages, features, bonuses, and FAQs).

***IMPORTANT BRIEFING***
The business owner has already identified which of their target audience's problems, desires, objections, and beliefs this offer addresses. Use these VOC (voice of customer) mappings as your primary guide for:
- Framing the USP around what matters most to this audience
- Writing outcomes/benefits in the audience's language
- Creating features that directly solve mapped problems
- Designing bonuses that address specific objections
- Writing FAQs that handle remaining psychological barriers

**USP (Unique Selling Proposition):**
1-2 sentences. The "only we…" or "because we…". Must be specific to THIS offer and THIS audience — not generic. Reference what makes the approach genuinely different.

**USP Explanation:**
2-3 sentences explaining why the USP is effective and how it differentiates from alternatives.

**CTA (Call to Action):**
The primary action text. Direct, specific, low-friction. e.g. "Book your strategy call", "Start the diagnostic".

**PRICING:**
Propose a pricing structure that fits the offer type. Include a price reframing note — contextualise the price against the value of the outcomes.

**GUARANTEE:**
Design a guarantee that reduces perceived risk while being commercially viable. The headline should be memorable.

**ENTITY OUTCOMES — generate generously:**
- **Outcomes** (at least 5): Specific, measurable results. "A clear positioning statement you can use immediately" not "better positioning".
- **Benefits** (at least 5): Second-order effects of those outcomes. What the outcome unlocks or enables.
- **Advantages** (at least 4): How this compares favourably to DIY, competitors, or doing nothing.
- **Features** (at least 5): What's included. Value-forward — not "2 sessions" but "Two 90-minute positioning intensives — you leave session 2 with a complete positioning statement".
- **Bonuses** (at least 2): Each must address a specific objection. Include the objection it removes and the concrete value.
- **FAQs** (at least 5): Real questions with direct answers. Include faqType categorisation.

Write all statements in conversational, audience-resonant language. Tangible and specific beats abstract and generic.`

export const OFFER_EVALUATION_SYSTEM_PROMPT = `You are evaluating whether sufficient context has been provided to generate a high-quality offer profile.

You have the offer name, type, target audience profile, and which of their VOC statements this offer addresses.

Evaluate whether this is enough to generate:
- A specific USP and positioning
- Realistic pricing
- Meaningful guarantee
- Audience-resonant outcomes, benefits, features, bonuses, and FAQs

If the context is sufficient, set ready=true.
If you need clarification on 1-3 specific points (e.g. pricing range, delivery format, key differentiator), set ready=false and provide targeted questions. Maximum 3 questions.`

export const JOURNEY_GENERATION_SYSTEM_PROMPT = `***YOUR ROLE***
You're a customer journey strategist who understands how people move from first awareness through to advocacy for service-based offers.

***YOUR TASK***
Generate a complete 5-stage customer journey for a specific offer. Each stage must capture what the customer is thinking, feeling, doing, and what pushes them to the next stage.

The stages are: Awareness → Consideration → Decision → Service → Advocacy.

**Guidelines:**
- Write from the customer's perspective, using language that matches their world
- Be specific to THIS offer and THIS audience — not generic journey stages
- "Thinking" should capture internal dialogue and questions
- "Feeling" should capture emotional state honestly (including doubt, frustration, excitement)
- "Doing" should capture concrete observable actions
- "Push to next" should identify the specific trigger or moment that escalates them — what do they see, hear, or experience that moves them forward?
- Advocacy stage has no "push to next" (there is no next stage)

Use the audience's VOC statements (problems, desires) to ground the journey in their real experience.`

// ---------------------------------------------------------------------------
// User message builders
// ---------------------------------------------------------------------------

export function buildOfferGenerationUserMessage(
  input: OfferPromptInput,
  context: OfferPromptContext
): string {
  const parts: string[] = []

  if (context.business) {
    parts.push(`***BUSINESS CONTEXT***`)
    if (context.business.businessName) parts.push(`Business: ${context.business.businessName}`)
    if (context.business.vertical) parts.push(`Vertical: ${context.business.vertical}`)
    if (context.business.specialism) parts.push(`Specialism: ${context.business.specialism}`)
    if (context.business.shortDescription) parts.push(`Description: ${context.business.shortDescription}`)
    parts.push('')
  }

  if (context.existingOffers.length > 0) {
    parts.push(`***EXISTING OFFERS (for differentiation)***`)
    for (const offer of context.existingOffers) {
      parts.push(`- ${offer.name} (${offer.offerType}): ${offer.overview ?? 'No overview yet'}`)
    }
    parts.push('')
  }

  parts.push(`***THIS OFFER***`)
  parts.push(`Name: ${input.name}`)
  parts.push(`Type: ${input.offerType}`)
  parts.push('')

  parts.push(`***TARGET AUDIENCE***`)
  parts.push(`Segment: ${input.audienceSegmentName}`)
  parts.push(`Role: ${input.audienceRoleContext}`)
  parts.push('')

  parts.push(`***VOC STATEMENTS THIS OFFER ADDRESSES***`)
  if (input.vocStatements.problems.length > 0) {
    parts.push(`Problems:`)
    input.vocStatements.problems.forEach(p => parts.push(`  - ${p}`))
  }
  if (input.vocStatements.desires.length > 0) {
    parts.push(`Desires:`)
    input.vocStatements.desires.forEach(d => parts.push(`  - ${d}`))
  }
  if (input.vocStatements.objections.length > 0) {
    parts.push(`Objections:`)
    input.vocStatements.objections.forEach(o => parts.push(`  - ${o}`))
  }
  if (input.vocStatements.beliefs.length > 0) {
    parts.push(`Beliefs:`)
    input.vocStatements.beliefs.forEach(b => parts.push(`  - ${b}`))
  }

  if (input.followUpAnswers && input.followUpAnswers.length > 0) {
    parts.push('')
    parts.push(`***ADDITIONAL CONTEXT (from follow-up questions)***`)
    for (const qa of input.followUpAnswers) {
      parts.push(`Q: ${qa.question}`)
      parts.push(`A: ${qa.answer}`)
    }
  }

  parts.push('')
  parts.push('Generate the complete offer profile now.')

  return parts.join('\n')
}

export function buildOfferEvaluationUserMessage(
  input: OfferPromptInput,
  context: OfferPromptContext
): string {
  return buildOfferGenerationUserMessage(input, context).replace(
    'Generate the complete offer profile now.',
    'Evaluate whether this context is sufficient to generate a high-quality offer profile. If not, ask up to 3 targeted follow-up questions.'
  )
}

export function buildJourneyUserMessage(input: JourneyPromptInput): string {
  const parts: string[] = []

  parts.push(`***OFFER***`)
  parts.push(`Name: ${input.offerName}`)
  parts.push(`Type: ${input.offerType}`)
  parts.push(`Overview: ${input.overview}`)
  parts.push(`USP: ${input.usp}`)
  parts.push('')

  parts.push(`***TARGET AUDIENCE***`)
  parts.push(`Segment: ${input.audienceSegmentName}`)
  parts.push(`Role: ${input.audienceRoleContext}`)
  parts.push('')

  if (input.vocStatements.problems.length > 0) {
    parts.push(`Problems this offer addresses:`)
    input.vocStatements.problems.forEach(p => parts.push(`  - ${p}`))
  }
  if (input.vocStatements.desires.length > 0) {
    parts.push(`Desires this offer fulfils:`)
    input.vocStatements.desires.forEach(d => parts.push(`  - ${d}`))
  }

  if (input.outcomeSummary) {
    parts.push('')
    parts.push(`***KEY OUTCOMES***`)
    parts.push(input.outcomeSummary)
  }

  parts.push('')
  parts.push('Generate the complete 5-stage customer journey now.')

  return parts.join('\n')
}
