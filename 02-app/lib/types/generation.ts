import { z } from 'zod'

// ---------------------------------------------------------------------------
// Generation input — what the user provides via the modal
// ---------------------------------------------------------------------------

export interface GenerateSegmentInput {
  brandId: string
  roleContext: string
  biggestProblem?: string
  biggestDesire?: string
  followUpAnswers?: { question: string; answer: string }[]
}

// ---------------------------------------------------------------------------
// Evaluation result — LLM decides if it has enough context
// ---------------------------------------------------------------------------

export interface SegmentEvaluationResult {
  ready: boolean
  questions?: string[]
}

export const segmentEvaluationSchema = z.object({
  ready: z.boolean().describe('Whether the provided context is sufficient to generate a high-quality audience segment profile'),
  questions: z.array(z.string()).optional().describe('1-2 targeted follow-up questions to ask if not ready. Max 2.'),
})

// ---------------------------------------------------------------------------
// Generation output — what the LLM produces
// ---------------------------------------------------------------------------

const vocCategorySchema = z.enum(['practical', 'emotional', 'psychological', 'social'])

const vocProblemSchema = z.object({
  text: z.string().describe('First-person VOC problem statement in conversational language'),
  category: vocCategorySchema,
})

const vocDesireSchema = z.object({
  text: z.string().describe('Desire statement as a standalone phrase — no "I want" or "I desire" prefix'),
  category: vocCategorySchema,
})

const vocObjectionSchema = z.object({
  objection: z.string().describe('The objection in the persona\'s voice'),
  answer: z.string().describe('Persuasive response addressing surface objection, misunderstandings, and underlying psychology'),
})

const vocBeliefSchema = z.object({
  text: z.string().describe('Shared belief statement — the positive flip of the doppelganger\'s incompatible trait'),
  notes: z.string().describe('Doppelganger reasoning — what the near-miss version of this persona believes instead'),
})

const demographicsSchema = z.object({
  ageRange: z.string().optional().describe('Only if relevant to this segment'),
  gender: z.string().optional(),
  ethnicity: z.string().optional(),
  orientation: z.string().optional(),
  location: z.string().optional(),
  income: z.string().optional(),
  education: z.string().optional(),
  occupation: z.string().optional(),
  businessIndustry: z.string().optional(),
  businessStage: z.string().optional(),
  businessModel: z.string().optional(),
  familySituation: z.string().optional(),
  notes: z.string().optional().describe('Any demographic context that doesn\'t fit the fields above'),
}).describe('Only populate fields that are genuinely relevant to this specific audience segment')

const psychographicsSchema = z.object({
  personalityTraits: z.string().describe('How they tend to think and behave — cognitive style, emotional tendencies, interpersonal patterns. 2-4 sentences.'),
  lifestyle: z.string().describe('How they spend their time, structure their days, what they prioritise outside work. 2-4 sentences.'),
  valuesAndWorldview: z.string().describe('What they believe about the world, their industry, and how things should be done. 2-4 sentences.'),
  motivations: z.string().describe('What drives decisions at a deeper level than stated desires — the underlying why. 2-4 sentences.'),
  identity: z.string().describe('How they see themselves; how they want to be seen by others; what they\'re proud of. 2-4 sentences.'),
})

export const segmentGenerationSchema = z.object({
  segmentName: z.string().describe('2-4 word label that expresses concisely who is being targeted'),
  personaName: z.string().describe('A distinctive full name (first and last) for this persona. Must be different from any existing segment persona names. Avoid common names.'),
  summary: z.string().describe('~50 word overview starting "This audience..." — do NOT use the persona or segment name in this summary'),
  roleContext: z.string().describe('Refined and expanded version of the user\'s input describing this persona\'s role'),
  demographics: demographicsSchema,
  psychographics: psychographicsSchema,
  problems: z.array(vocProblemSchema).min(20).describe('At least 20 VOC problem statements covering practical, emotional, psychological, and social categories'),
  desires: z.array(vocDesireSchema).min(20).describe('At least 20 VOC desire statements covering all four categories'),
  objections: z.array(vocObjectionSchema).min(10).describe('At least 10 objections with detailed, persuasive responses'),
  sharedBeliefs: z.array(vocBeliefSchema).min(5).describe('At least 6 shared beliefs using the doppelganger flip method'),
  avatarPrompt: z.string().describe('AI image generation prompt starting with "Generate a raw, real-life, photorealistic studio shot of..." and ending with "headshot (head and shoulders), eye-level"'),
})

export type SegmentGenerationOutput = z.infer<typeof segmentGenerationSchema>

// ---------------------------------------------------------------------------
// Platform generation
// ---------------------------------------------------------------------------

export interface GeneratePlatformInput {
  brandId: string
  name: string
  category: string
  channel: string
  handle?: string
  primaryObjective?: string
  audience?: string
  followUpAnswers?: { question: string; answer: string }[]
}

export interface PlatformEvaluationResult {
  ready: boolean
  questions?: string[]
}

export const platformEvaluationSchema = z.object({
  ready: z.boolean().describe('Whether the provided context is sufficient to generate a high-quality platform strategy'),
  questions: z.array(z.string()).optional().describe('1-2 targeted follow-up questions to ask if not ready. Max 2.'),
})

const contentFormatSchema = z.object({
  format: z.string().describe('Name of the content format, e.g. "Text post", "Carousel", "Interview episode"'),
  description: z.string().describe('How this format works on this platform — structure, length, visual requirements'),
  characterLimit: z.number().optional().describe('Character or duration limit for this format'),
  bestFor: z.array(z.string()).describe('What this format is best used for — e.g. "thought leadership", "frameworks", "storytelling"'),
  frequency: z.string().describe('How often to publish in this format — e.g. "2x per week", "Monthly"'),
})

const subtopicIdeaSchema = z.object({
  subtopic: z.string().describe('A content theme or angle cluster'),
  examples: z.array(z.string()).min(2).describe('2-4 specific content ideas within this subtopic'),
})

const signatureFeatureSchema = z.object({
  name: z.string().describe('Name of the recurring editorial feature'),
  description: z.string().describe('What this feature is and why it builds brand recognition'),
})

export const platformGenerationSchema = z.object({
  primaryObjective: z.string().describe('What this platform is for — the strategic purpose in 1-2 sentences'),
  audience: z.string().describe('Who the audience is on this platform — may differ from overall audience segments'),
  contentStrategy: z.string().describe('Overall approach to this platform — posting philosophy, content mix rationale, relationship to other channels. 2-4 sentences.'),
  postingFrequency: z.string().describe('Overall posting cadence, e.g. "3x per week" or "Weekly episodes"'),
  customerJourneyStage: z.enum(['awareness', 'engagement', 'conversion', 'delight_advocacy']).describe('Primary stage in the customer journey this platform serves'),
  growthFunction: z.string().describe('How this platform specifically helps the business grow — thought leadership, lead gen, traffic, conversion, community, partnerships, education. 2-3 sentences.'),
  usp: z.string().describe('What makes this brand\'s presence on this platform distinct from others in the space. 1-2 sentences.'),
  engagementApproach: z.string().describe('How to engage with comments, DMs, community on this platform. 2-3 sentences.'),
  hashtagStrategy: z.string().optional().describe('How hashtags are used on this platform. Only include for social platforms.'),
  contentFormats: z.array(contentFormatSchema).min(2).describe('At least 2 content formats appropriate for this platform'),
  subtopicIdeas: z.array(subtopicIdeaSchema).min(3).describe('At least 3 subtopic clusters with example content ideas'),
  structureAndFeatures: z.object({
    signatureFeatures: z.array(signatureFeatureSchema).min(1).describe('At least 1 signature editorial feature that builds brand recognition'),
    contentStructure: z.string().describe('The typical structure of a piece of content on this platform — e.g. "Hook → Setup → Insight → CTA"'),
    brandedComponents: z.array(z.string()).min(1).describe('Recurring stylistic elements — e.g. "Opens without preamble", "Ends with a question"'),
  }),
  characterLimits: z.record(z.string(), z.union([z.string(), z.number()])).describe('Platform-specific character or format limits as key-value pairs, e.g. { "post": 3000, "headline": 220, "notes": "Algorithm favours posts under 1200 chars" }'),
  doNotDo: z.array(z.string()).min(2).describe('At least 2 platform-specific things to avoid — content types, approaches, or styles that don\'t work here'),
  analyticsGoals: z.string().describe('What metrics matter on this platform — what does success look like? 1-2 sentences.'),
  contentPillarThemes: z.string().optional().describe('How content pillars manifest on this platform — which themes get traction, which angles work'),
})

export type PlatformGenerationOutput = z.infer<typeof platformGenerationSchema>

// ---------------------------------------------------------------------------
// Tone of voice generation (DNA-09)
// ---------------------------------------------------------------------------

const tovDimensionSchema = z.object({
  score: z.number().int().min(0).max(100),
  description: z.string().describe('1-3 sentences describing how this dimension manifests in the voice, in the author\'s own register'),
})

const tovVocabEntrySchema = z.object({
  use: z.string().describe('Preferred word or phrase'),
  avoid: z.string().describe('The word or phrase it replaces'),
  notes: z.string().describe('When or why — brief context. Empty string if none.'),
})

export const tovGenerationSchema = z.object({
  dimensions: z.object({
    humour: tovDimensionSchema,
    reverence: tovDimensionSchema,
    formality: tovDimensionSchema,
    enthusiasm: tovDimensionSchema,
  }),
  summary: z.string().describe('2-3 paragraph guideline written in the author\'s own voice (first person)'),
  linguisticNotes: z.string(),
  emotionalResonance: z.string(),
  brandVocabulary: z.object({
    overview: z.string().describe('Pattern-level vocabulary guidance'),
    entries: z.array(tovVocabEntrySchema).describe('Specific paired word choices'),
  }),
  language: z.string().describe('BCP 47 language tag, e.g. "en-GB"'),
  grammaticalPerson: z.enum(['first_singular', 'first_plural', 'second']),
})

export type TovGenerationOutput = z.infer<typeof tovGenerationSchema>
