import { z } from 'zod'

// ---------------------------------------------------------------------------
// Generation input — what the creation modal provides
// ---------------------------------------------------------------------------

export interface GenerateAssetInput {
  brandId: string
  name: string
  kind: string
  proprietary: boolean
  audienceSegmentId: string
  vocMapping: {
    problems: number[]
    desires: number[]
    objections: number[]
    beliefs: number[]
  }
  /** Extracted text from selected source documents */
  sourceDocTexts?: string[]
  followUpAnswers?: { question: string; answer: string }[]
}

// ---------------------------------------------------------------------------
// Evaluation result — LLM decides if it has enough context
// ---------------------------------------------------------------------------

export interface AssetEvaluationResult {
  ready: boolean
  questions?: string[]
}

export const assetEvaluationSchema = z.object({
  ready: z.boolean().describe('Whether the provided context is sufficient to generate a high-quality knowledge asset profile'),
  questions: z.array(z.string()).optional().describe('1-3 targeted follow-up questions to clarify principles, differentiators, origin, or application context. Max 3.'),
})

// ---------------------------------------------------------------------------
// Generation output — what the LLM produces
// ---------------------------------------------------------------------------

const keyComponentSchema = z.object({
  title: z.string().describe('Component name/title'),
  description: z.string().describe('Substantive 2-4 sentence description — this is source data, not a bullet label'),
  sortOrder: z.number().describe('Sequential order starting from 1'),
})

const flowStepSchema = z.object({
  step: z.number().describe('Step number'),
  title: z.string().describe('Step title'),
  description: z.string().describe('What happens in this step — 2-4 sentences'),
  clientExperience: z.string().describe('How the client/user experiences this step'),
  decisionPoints: z.string().describe('Any branching decisions or variations at this step'),
})

const assetFaqSchema = z.object({
  question: z.string().describe('A question someone would ask about this asset'),
  answer: z.string().describe('Clear, specific answer'),
  type: z.enum(['differentiation', 'logistics', 'psychological', 'application']),
})

const outcomeItemSchema = z.object({
  body: z.string().describe('1-2 sentence specific, measurable result from applying this asset. Written in conversational language for the target audience. Not generic.'),
  category: z.enum(['resources', 'skills', 'mindset', 'relationships', 'status']).optional(),
})

const benefitItemSchema = z.object({
  body: z.string().describe('1-2 sentence advantage the user/client gains from the outcomes. Immediate, long-term, or compounding. Written in conversational language.'),
  category: z.enum(['resources', 'skills', 'mindset', 'relationships', 'status']).optional(),
})

const advantageItemSchema = z.object({
  body: z.string().describe('1-2 sentence comparison to alternatives, DIY, doing nothing, or competitor approaches. Specific to THIS asset.'),
})

const methodologyDetailSchema = z.object({
  deliveryFormat: z.string().optional().describe('e.g. 1-to-1 intensive, workshop, async'),
  duration: z.string().optional(),
  repeatability: z.string().optional(),
  certificationOffered: z.boolean().optional(),
})

const frameworkDetailSchema = z.object({
  dimensions: z.array(z.string()).optional(),
  visualMetaphor: z.string().optional(),
  applicationContext: z.string().optional(),
})

const toolDetailSchema = z.object({
  format: z.string().optional().describe('e.g. Google Doc, Notion, Figma'),
  fillTime: z.string().optional(),
  outputFormat: z.string().optional(),
})

export const assetGenerationSchema = z.object({
  summary: z.string().describe('50-80 word overview written in brand voice. For prompt injection and card display.'),
  principles: z.string().describe('Core beliefs, theoretical foundations, philosophies that underpin this asset. 3-5 sentences.'),
  origin: z.string().describe('How and why this was developed. Origin story with pivotal moments and evolution. 3-5 sentences.'),
  keyComponents: z.array(keyComponentSchema).describe('Structured breakdown of core elements. Rich descriptions, not bullet labels.'),
  flow: z.array(flowStepSchema).describe('Sequence or cycle of implementation. How components work together.'),
  objectives: z.string().describe('Stated outcomes or goals — what this asset is trying to achieve'),
  problemsSolved: z.string().describe('Specific problems or challenges this asset addresses'),
  contexts: z.string().describe('Primary contexts of application — industries, company sizes, scenarios'),
  priorKnowledge: z.string().optional().describe('Prerequisites — only for methodology/process kinds'),
  resources: z.string().optional().describe('Tools, conditions, or inputs required — only for methodology/process kinds'),
  detail: z.union([methodologyDetailSchema, frameworkDetailSchema, toolDetailSchema]).describe('Kind-specific fields'),
  faqs: z.array(assetFaqSchema).describe('3-5 FAQs about this asset'),
  outcomes: z.array(outcomeItemSchema).min(8).describe('At least 8 specific, measurable results from applying this asset. More is better — this is source data.'),
  benefits: z.array(benefitItemSchema).min(8).describe('At least 8 advantages users/clients gain from those outcomes. More is better.'),
  advantages: z.array(advantageItemSchema).min(6).describe('At least 6 comparisons to alternatives, DIY, or doing nothing. More is better.'),
})

export type AssetGenerationOutput = z.infer<typeof assetGenerationSchema>
