import { NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/llm/embeddings'
import { findSimilarNodes } from '@/lib/retrieval/similarity'
import { findCanonicalName } from '@/lib/graph/canonical'

/**
 * POST /api/inputs/dedup
 *
 * Check extracted items for duplicates against committed graph nodes
 * and canonical name matches for People/Organisations.
 *
 * Body: { items: Array<{ id, text, label, category }> }
 * Returns: { matches, canonicalMatches }
 */

interface DedupItem {
  id: string
  text: string
  label: string    // graph node label to search against (Idea, Concept, Person, etc.)
  category: string // extraction category key (ideas, concepts, people, etc.)
}

interface DedupMatch {
  matchedNodeId: string
  matchedNodeName: string
  matchedNodeLabel: string
  score: number
  source: 'graph' | 'pending'
}

// Map extraction category to the graph labels to compare against
const CATEGORY_TO_LABELS: Record<string, string[]> = {
  ideas: ['Idea'],
  concepts: ['Concept'],
  people: ['Person'],
  organisations: ['Organisation'],
  techniques: ['Methodology'],
  contentAngles: ['Idea'], // content angles are stored as Idea nodes
  stories: [], // stories don't have graph nodes in v1
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const items = body.items as DedupItem[]

    if (!items || items.length === 0) {
      return NextResponse.json({ matches: {}, canonicalMatches: {} })
    }

    const matches: Record<string, DedupMatch[]> = {}
    const canonicalMatches: Record<string, string> = {}

    // Process items in parallel (batched to avoid overwhelming the embedding API)
    const BATCH_SIZE = 5
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(async (item) => {
        // 1. Canonical name matching for People/Orgs
        if (item.category === 'people' || item.category === 'organisations') {
          const entityType = item.category === 'people' ? 'Person' : 'Organisation'
          // Extract the name from the text (for people/orgs, the name is the first part)
          const name = item.text.split(/[,.:]/)[0].trim()
          const canonical = await findCanonicalName(entityType, name)
          if (canonical && canonical.toLowerCase() !== name.toLowerCase()) {
            canonicalMatches[item.id] = canonical
          }
        }

        // 2. Vector similarity against committed graph nodes
        const labels = CATEGORY_TO_LABELS[item.category]
        if (!labels || labels.length === 0) return

        try {
          const embedding = await generateEmbedding(item.text)
          if (!embedding) return

          const similar = await findSimilarNodes(embedding, {
            labels,
            threshold: 0.75,
            limit: 3,
          })

          if (similar.length > 0) {
            matches[item.id] = similar.map((s) => ({
              matchedNodeId: s.id,
              matchedNodeName: s.label,
              matchedNodeLabel: s.nodeLabel,
              score: s.score,
              source: 'graph' as const,
            }))
          }
        } catch (err) {
          console.error(`[dedup] embedding/search failed for item ${item.id}:`, err)
        }
      }))
    }

    return NextResponse.json({ matches, canonicalMatches })
  } catch (err) {
    console.error('[POST /api/inputs/dedup]', err)
    return NextResponse.json(
      { error: 'Dedup check failed' },
      { status: 500 }
    )
  }
}
