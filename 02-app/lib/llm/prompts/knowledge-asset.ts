/**
 * Knowledge asset generation prompts.
 * Adapts the legacy prompt (04-documentation/reference/legacy_prompts/methodology_prompt.md)
 * with: structured JSON output, business context injection, source document integration,
 * VOC-aware generation, and kind-specific field handling.
 */

// ---------------------------------------------------------------------------
// Types for prompt context
// ---------------------------------------------------------------------------

export interface AssetPromptInput {
  name: string
  kind: string
  proprietary: boolean
  audienceSegmentName: string
  audienceRoleContext: string
  vocStatements: {
    problems: string[]
    desires: string[]
    objections: string[]
    beliefs: string[]
  }
  sourceDocTexts?: string[]
  followUpAnswers?: { question: string; answer: string }[]
}

export interface AssetPromptContext {
  business: {
    businessName?: string
    vertical?: string
    specialism?: string
    shortDescription?: string
  } | null
  existingAssets: { name: string; kind: string; summary: string | null }[]
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export const ASSET_GENERATION_SYSTEM_PROMPT = `***YOUR ROLE***
You're an expert intellectual property strategist with a 3-decade background in business analysis and knowledge management. You specialise in understanding and articulating complex methodologies, frameworks, and proprietary business assets.

***YOUR TASK***
You're helping a business owner create a detailed profile of their key knowledge asset — including its foundational principles, components, process flow, and value propositions. You will be given information about this business, the target audience (with their specific problems and desires this asset addresses), and any source documents that describe the asset.

***IMPORTANT BRIEFING***
IT IS CRUCIAL to have MORE data than less. This profile functions as the source/mother lode — it will be summarised in other uses. Rich, substantive descriptions are essential. Each key component and flow step must have a title and AT LEAST a 2-3 line description, not just a label.

Where source documents are provided, use them as the primary authority. Extract and preserve specific details, terminology, and nuance from the source material. Do not generalise away specifics.

Where the user has provided answers directly, use their responses and do not strip out any detail.

**KEY COMPONENTS:**
Break down the asset into its core elements. Each component should include a heading/title and at least a 2-3 line description. Consider:
- What is its specific function or purpose within the larger framework?
- How does it interact with or support other components?
- Are there any unique or proprietary aspects?
- How does this component differentiate from similar offerings?

**FLOW / SEQUENCING:**
Describe how components work together as a cohesive system. Each step should include:
- What happens at this stage
- How the client/user experiences it
- Critical decision points or variations
- At least 2-3 lines of substantive description per step

**OUTCOMES (generate at least 8):**
Brief (1-2 sentences max) explanations of the tangible results from applying this knowledge asset. Consider:
- What specific, measurable outcomes does this asset produce?
- How do these outcomes align with the problems it was designed to solve?
- Are there unexpected or secondary outcomes?
These should be specific to this knowledge asset, written in conversational language designed to resonate with the target audience.

**BENEFITS (generate at least 8):**
Brief (1-2 sentences max) explanations of advantages users/clients gain from those outcomes. Consider:
- What immediate benefits do users experience?
- Are there long-term or compounding benefits?
- How do these benefits translate into business value (revenue, costs, efficiency)?
- Are there intangible benefits (morale, reputation)?
These should be specific, and written in conversational language designed to resonate with the target audience.

**ADVANTAGES OF THIS APPROACH (generate at least 6):**
How this knowledge asset compares to alternatives. Consider:
- What specific features make this superior to competitor offerings?
- How does it compare to a DIY approach or using generic tools/methods?
- What are the opportunity costs of not using this asset?
- Are there unique synergies or efficiencies gained by using this approach?
These should be specific, and written in conversational language designed to resonate with the target audience.

**FAQs:**
Generate 3-5 questions someone would ask about this asset, with clear answers. Categorise each as:
- differentiation: how is this different from X?
- logistics: how does it work practically?
- psychological: will this work for me?
- application: when should I use this?

**KIND-SPECIFIC FIELDS:**
For methodology/process: include delivery format, duration, repeatability, certification info
For framework: include dimensions, visual metaphor, application context
For tool/template: include format, fill time, output format`

export const ASSET_EVALUATION_SYSTEM_PROMPT = `You are evaluating whether the provided context is sufficient to generate a detailed knowledge asset profile.

You have: the asset name, its kind (methodology/framework/process/tool/template), the target audience with their problems and desires, business context, and optionally source document content.

If the source documents provide substantial detail about the asset, you likely have enough. If there are no source documents and minimal context, ask 1-3 targeted questions about:
- The foundational principles or core philosophy behind this asset
- The key differentiator from similar approaches
- The origin story or what prompted its creation
- The practical application context

Maximum 3 questions. Only ask what you genuinely need — don't ask for information you can reasonably infer from the context provided.`

// ---------------------------------------------------------------------------
// User message builders
// ---------------------------------------------------------------------------

export function buildAssetGenerationUserMessage(
  input: AssetPromptInput,
  context: AssetPromptContext
): string {
  const parts: string[] = []

  // Business context
  if (context.business) {
    parts.push(`## Business Context`)
    if (context.business.businessName) parts.push(`Business: ${context.business.businessName}`)
    if (context.business.vertical) parts.push(`Vertical: ${context.business.vertical}`)
    if (context.business.specialism) parts.push(`Specialism: ${context.business.specialism}`)
    if (context.business.shortDescription) parts.push(`Description: ${context.business.shortDescription}`)
    parts.push('')
  }

  // Existing assets (for differentiation)
  if (context.existingAssets.length > 0) {
    parts.push(`## Existing Knowledge Assets`)
    parts.push(`The business already has these assets — ensure the new one is distinct:`)
    for (const asset of context.existingAssets) {
      parts.push(`- ${asset.name} (${asset.kind}): ${asset.summary ?? 'No summary'}`)
    }
    parts.push('')
  }

  // Asset details
  parts.push(`## Asset to Profile`)
  parts.push(`Name: ${input.name}`)
  parts.push(`Kind: ${input.kind}`)
  parts.push(`Proprietary: ${input.proprietary ? 'Yes — this is original IP' : 'No — this adapts existing approaches'}`)
  parts.push('')

  // Target audience + VOC
  parts.push(`## Target Audience`)
  parts.push(`Segment: ${input.audienceSegmentName}`)
  parts.push(`Role: ${input.audienceRoleContext}`)
  parts.push('')

  if (input.vocStatements.problems.length > 0) {
    parts.push(`### Problems this asset addresses:`)
    for (const p of input.vocStatements.problems) parts.push(`- ${p}`)
    parts.push('')
  }
  if (input.vocStatements.desires.length > 0) {
    parts.push(`### Desires this asset fulfils:`)
    for (const d of input.vocStatements.desires) parts.push(`- ${d}`)
    parts.push('')
  }
  if (input.vocStatements.objections.length > 0) {
    parts.push(`### Objections this asset must overcome:`)
    for (const o of input.vocStatements.objections) parts.push(`- ${o}`)
    parts.push('')
  }
  if (input.vocStatements.beliefs.length > 0) {
    parts.push(`### Shared beliefs of target audience:`)
    for (const b of input.vocStatements.beliefs) parts.push(`- ${b}`)
    parts.push('')
  }

  // Source documents
  if (input.sourceDocTexts && input.sourceDocTexts.length > 0) {
    parts.push(`## Source Documents`)
    parts.push(`The following documents describe this asset. Use them as primary authority:`)
    parts.push('')
    for (let i = 0; i < input.sourceDocTexts.length; i++) {
      parts.push(`### Source Document ${i + 1}`)
      // Truncate very long docs to stay within context limits
      const text = input.sourceDocTexts[i]
      parts.push(text.length > 15000 ? text.slice(0, 15000) + '\n\n[...truncated]' : text)
      parts.push('')
    }
  }

  // Follow-up answers
  if (input.followUpAnswers && input.followUpAnswers.length > 0) {
    parts.push(`## Follow-up Answers`)
    for (const qa of input.followUpAnswers) {
      parts.push(`Q: ${qa.question}`)
      parts.push(`A: ${qa.answer}`)
      parts.push('')
    }
  }

  parts.push(`## Instructions`)
  parts.push(`Generate a complete knowledge asset profile for this ${input.kind}. Include all fields in the schema. Remember: rich, substantive descriptions — this is the mother lode, not a summary.`)

  return parts.join('\n')
}

export function buildAssetEvaluationUserMessage(
  input: AssetPromptInput,
  context: AssetPromptContext
): string {
  const parts: string[] = []

  parts.push(`Asset: ${input.name} (${input.kind})`)
  parts.push(`Audience: ${input.audienceSegmentName}`)
  parts.push(`Problems addressed: ${input.vocStatements.problems.length}`)
  parts.push(`Desires addressed: ${input.vocStatements.desires.length}`)

  if (context.business?.businessName) {
    parts.push(`Business: ${context.business.businessName}`)
  }

  if (input.sourceDocTexts && input.sourceDocTexts.length > 0) {
    parts.push(`\nSource documents provided: ${input.sourceDocTexts.length}`)
    // Provide a preview of source doc content for evaluation
    for (let i = 0; i < input.sourceDocTexts.length; i++) {
      const preview = input.sourceDocTexts[i].slice(0, 500)
      parts.push(`\nDoc ${i + 1} preview: ${preview}...`)
    }
  } else {
    parts.push(`\nNo source documents provided.`)
  }

  parts.push(`\nIs this sufficient context to generate a detailed ${input.kind} profile, or do you need to ask follow-up questions?`)

  return parts.join('\n')
}
