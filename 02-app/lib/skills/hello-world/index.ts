import { z } from 'zod'
import type { Skill } from '../types'
import { loadBrief } from '../load-brief'

const brief = loadBrief('lib/skills/hello-world/brief.md')

const gatheredSchema = z.object({
  topicCurious: z
    .string()
    .optional()
    .describe('The topic of curiosity the user named, captured verbatim or paraphrased.'),
  retrievedInsight: z
    .string()
    .optional()
    .describe('One related insight retrieved from the knowledge base, if any.'),
})

export const helloWorld: Skill = {
  id: 'hello-world',
  name: 'Hello world',
  description: 'Test fixture for the skills runtime — discursive, one retrieval call.',
  briefVersion: '1.0.0',
  brief,
  mode: 'discursive',
  checklist: [
    {
      id: 'topic',
      label: 'Topic of curiosity captured',
      schema: z.string(),
    },
  ],
  subAgents: ['retrieval_bot'],
  gatheredSchema,
  openingMessage: () =>
    "Hi — I'm the hello-world skill. What's on your mind today?",
}
