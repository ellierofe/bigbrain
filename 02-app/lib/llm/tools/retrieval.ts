import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { searchKnowledge } from '@/lib/retrieval/similarity'
import { getDna, getSource, getProcessingRun } from '@/lib/retrieval/structured'
import { traverseFrom } from '@/lib/retrieval/graph-traversal'
import type { DnaType, SourceType } from '@/lib/retrieval/types'

// Zod schemas for tool parameters
const searchKnowledgeSchema = z.object({
  query: z.string().describe('Natural language search query'),
  types: z
    .array(z.string())
    .optional()
    .describe('Filter to specific result types, e.g. ["graph_node", "testimonial"]'),
  limit: z
    .number()
    .optional()
    .describe('Max results to return (default 10, max 50)'),
})

const getDnaSchema = z.object({
  dna_type: z
    .enum([
      'business_overview',
      'brand_meaning',
      'value_proposition',
      'brand_identity',
      'audience_segments',
      'offers',
      'knowledge_assets',
      'platforms',
      'competitors',
      'tone_of_voice',
    ] as const)
    .describe('The type of DNA data to load'),
  item_id: z
    .string()
    .optional()
    .describe('For plural types — load a specific item by ID. Omit to get all items.'),
  facet: z
    .string()
    .optional()
    .describe('Extract a specific field, e.g. "problems", "objections", "faqs", "pricing".'),
})

const getSourceSchema = z.object({
  source_type: z
    .enum(['documents', 'statistics', 'testimonials', 'stories', 'research', 'analysis'] as const)
    .describe('The type of source knowledge to load'),
  item_id: z
    .string()
    .optional()
    .describe('Load a specific item by ID'),
  query: z
    .string()
    .optional()
    .describe('Search within this source type by query (semantic search). Cannot be used with item_id.'),
})

const exploreGraphSchema = z.object({
  node_id: z.string().describe('The ID of the starting node to explore from'),
  depth: z
    .number()
    .optional()
    .describe('How many hops to traverse (1-3, default 1)'),
  relationship_types: z
    .array(z.string())
    .optional()
    .describe('Filter to specific relationship types, e.g. ["DERIVED_FROM", "SUPPORTS"]'),
  node_labels: z
    .array(z.string())
    .optional()
    .describe('Filter connected nodes to specific types, e.g. ["Idea", "Person"]'),
})

type SearchInput = z.infer<typeof searchKnowledgeSchema>
type DnaInput = z.infer<typeof getDnaSchema>
type SourceInput = z.infer<typeof getSourceSchema>
type GraphInput = z.infer<typeof exploreGraphSchema>

/**
 * Create retrieval tools for the chat LLM.
 * brandId flows via closure — the LLM never sees or guesses it.
 * Returns an object of AI SDK tool definitions for use with streamText().
 */
export function createRetrievalTools(brandId: string) {
  return {
    search_knowledge: tool<SearchInput, any>({
      description:
        'Search across all knowledge — graph nodes, source documents, statistics, testimonials, stories, research, analysis results, and brand DNA — for items semantically similar to the query. Use this for open-ended questions like "what do I know about X?" or "find insights related to Y".',
      inputSchema: zodSchema(searchKnowledgeSchema),
      execute: async (input) => {
        return searchKnowledge(input.query, {
          types: input.types as any,
          limit: input.limit,
        })
      },
    }),

    get_brand_dna: tool<DnaInput, any>({
      description:
        'Load specific Brand DNA data. Use this when the user asks about their business overview, value proposition, audience segments, offers, methodologies, tone of voice, positioning, or other strategic elements.',
      inputSchema: zodSchema(getDnaSchema),
      execute: async (input) => {
        return getDna(input.dna_type as DnaType, brandId, input.item_id, input.facet)
      },
    }),

    get_source_knowledge: tool<SourceInput, any>({
      description:
        'Load source knowledge — documents (transcripts, research files), statistics, testimonials, stories, own research, or analysis results.',
      inputSchema: zodSchema(getSourceSchema),
      execute: async (input) => {
        if (input.item_id) {
          if (input.source_type === 'analysis') {
            const result = await getProcessingRun(input.item_id)
            return result ? [result] : []
          }
          return getSource(input.source_type as SourceType, brandId, input.item_id)
        }
        return getSource(input.source_type as SourceType, brandId, undefined, input.query)
      },
    }),

    explore_graph: tool<GraphInput, any>({
      description:
        'Explore the knowledge graph from a starting node. Returns connected nodes and relationships. Supports 1-3 hops.',
      inputSchema: zodSchema(exploreGraphSchema),
      execute: async (input) => {
        return traverseFrom(input.node_id, {
          depth: input.depth,
          relationshipTypes: input.relationship_types,
          nodeLabels: input.node_labels,
        })
      },
    }),
  }
}
