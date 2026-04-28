import { z } from 'zod'
import { MODELS, generateObjectWithFallback } from '@/lib/llm/client'
import type { ExtractionOutput } from '@/lib/types/processing'

// ---------------------------------------------------------------------------
// Topic clustering — groups extracted items by overarching topic
// ---------------------------------------------------------------------------

export interface TopicCluster {
  topic: string
  items: Array<{ id: string; category: string }>
}

const clusterSchema = z.object({
  clusters: z.array(
    z.object({
      topic: z.string().describe('Short topic label, 2-6 words'),
      itemIds: z.array(z.string()).describe('IDs of items belonging to this topic'),
    })
  ),
})

/**
 * Groups extracted items into topic clusters using a fast LLM call.
 * Returns an array of TopicClusters. Items not assigned to any cluster
 * go into an "Other" cluster.
 */
export async function clusterByTopic(
  extraction: ExtractionOutput
): Promise<TopicCluster[]> {
  // Build a flat list of items with their IDs and text for the LLM
  const itemDescriptions: Array<{ id: string; category: string; text: string }> = []

  for (const idea of extraction.ideas ?? []) {
    itemDescriptions.push({ id: idea.id, category: 'ideas', text: idea.text })
  }
  for (const concept of extraction.concepts ?? []) {
    itemDescriptions.push({ id: concept.id, category: 'concepts', text: `${concept.name}: ${concept.description}` })
  }
  for (const person of extraction.people ?? []) {
    itemDescriptions.push({
      id: person.id,
      category: 'people',
      text: `${person.name}${person.role ? `, ${person.role}` : ''}${person.organisation ? ` at ${person.organisation}` : ''} — ${person.context}`,
    })
  }
  for (const org of extraction.organisations ?? []) {
    itemDescriptions.push({ id: org.id, category: 'organisations', text: `${org.name}: ${org.context}` })
  }
  for (const story of extraction.stories ?? []) {
    itemDescriptions.push({ id: story.id, category: 'stories', text: `${story.title}: ${story.narrative}` })
  }
  for (const technique of extraction.techniques ?? []) {
    itemDescriptions.push({ id: technique.id, category: 'techniques', text: `${technique.name}: ${technique.description}` })
  }
  for (const angle of extraction.contentAngles ?? []) {
    itemDescriptions.push({ id: angle.id, category: 'contentAngles', text: angle.angle })
  }

  if (itemDescriptions.length === 0) return []

  // For very small extractions, skip clustering
  if (itemDescriptions.length <= 3) {
    return [{
      topic: 'All items',
      items: itemDescriptions.map((d) => ({ id: d.id, category: d.category })),
    }]
  }

  const itemList = itemDescriptions
    .map((d) => `[${d.id}] ${d.text}`)
    .join('\n')

  try {
    const { object } = await generateObjectWithFallback<z.infer<typeof clusterSchema>>({
      model: MODELS.fast,
      schema: clusterSchema,
      prompt: `Group these extracted knowledge items by overarching topic. Each item has an ID in brackets.
Assign every item to exactly one topic. Use 2-6 word topic labels. Aim for 2-5 topics.
People and organisations should be grouped with the topic they were discussed in context of, not in their own separate group.

Items:
${itemList}`,
    }, { tag: 'INP-03 cluster' })

    // Build clusters with category info
    const idToCategory = new Map(itemDescriptions.map((d) => [d.id, d.category]))
    const assignedIds = new Set<string>()
    const clusters: TopicCluster[] = []

    for (const cluster of object.clusters) {
      const validItems: TopicCluster['items'] = []
      for (const id of cluster.itemIds) {
        const category = idToCategory.get(id)
        if (category) {
          validItems.push({ id, category })
          assignedIds.add(id)
        }
      }
      if (validItems.length > 0) {
        clusters.push({ topic: cluster.topic, items: validItems })
      }
    }

    // Catch any items the LLM missed
    const orphans = itemDescriptions
      .filter((d) => !assignedIds.has(d.id))
      .map((d) => ({ id: d.id, category: d.category }))

    if (orphans.length > 0) {
      clusters.push({ topic: 'Other', items: orphans })
    }

    return clusters
  } catch (err) {
    console.error('[clusterByTopic] LLM call failed, falling back to single cluster', err)
    return [{
      topic: 'All items',
      items: itemDescriptions.map((d) => ({ id: d.id, category: d.category })),
    }]
  }
}
