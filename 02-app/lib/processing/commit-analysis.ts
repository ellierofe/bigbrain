import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { processingRuns } from '@/lib/db/schema/inputs/processing-runs'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import { graphNodes } from '@/lib/db/schema/graph'
import { writeNode, writeEdge } from '@/lib/graph/write'
import { generateEmbedding } from '@/lib/llm/embeddings'
import { sql } from 'drizzle-orm'
import type {
  BatchAnalysis,
  ReflectiveAnalysis,
  ProjectSynthesis,
} from '@/lib/types/processing'

// ---------------------------------------------------------------------------
// commitAnalysis — map analysis results to graph nodes
// ---------------------------------------------------------------------------

export interface AnalysisCommitResult {
  success: boolean
  nodesWritten: number
  edgesWritten: number
  errors: string[]
}

/**
 * Commit a processing run's analysis results to the knowledge graph.
 * Maps themes → Concept nodes, insights/realisations → Idea nodes, etc.
 * Links all created nodes to the source documents that fed the analysis.
 */
export async function commitAnalysis(runId: string): Promise<AnalysisCommitResult> {
  const [run] = await db
    .select()
    .from(processingRuns)
    .where(eq(processingRuns.id, runId))
    .limit(1)

  if (!run) throw new Error(`Processing run ${runId} not found`)
  if (run.status === 'committed') throw new Error(`Processing run ${runId} is already committed`)

  // INP-12 legacy adapter: this whole function is replaced in Phase 2/3 (analysis output
  // moves to lens_reports.result; commit flow goes through /api/process/run/[id]/commit).
  // Until then, map the new lens vocab back to the INP-11 mode names and bail if the run
  // doesn't have legacy analysis data attached (which it won't post-Phase-0).
  const legacyRun = run as unknown as {
    lens: string
    title?: string | null
    analysisResult?: unknown
    sourceIds: string[]
    status: string
  }
  const modeMap: Record<string, string> = {
    'pattern-spotting': 'batch',
    'self-reflective': 'reflective',
    'project-synthesis': 'synthesis',
  }
  const mode = modeMap[legacyRun.lens] ?? legacyRun.lens
  if (!legacyRun.analysisResult) throw new Error(`Processing run ${runId} has no analysis result (INP-11 legacy path)`)

  const result: AnalysisCommitResult = { success: true, nodesWritten: 0, edgesWritten: 0, errors: [] }
  const source = `ANALYSIS_${mode.toUpperCase()}`
  const nodeIds: string[] = []

  // Dispatch to mode-specific commit
  switch (mode) {
    case 'batch':
      await commitBatch(legacyRun.analysisResult as BatchAnalysis, source, legacyRun.title ?? 'Batch analysis', nodeIds, result)
      break
    case 'reflective':
      await commitReflective(legacyRun.analysisResult as ReflectiveAnalysis, source, legacyRun.title ?? 'Reflective analysis', nodeIds, result)
      break
    case 'synthesis':
      await commitSynthesis(legacyRun.analysisResult as ProjectSynthesis, source, legacyRun.title ?? 'Project synthesis', nodeIds, result)
      break
    default:
      throw new Error(`Cannot commit analysis for mode '${mode}' — only batch, reflective, and synthesis are supported`)
  }

  // Link all created nodes to the source documents that fed the analysis
  if (run.sourceIds && run.sourceIds.length > 0 && nodeIds.length > 0) {
    // Get source document titles for edge descriptions
    const sourceDocs = await db
      .select({ id: srcSourceDocuments.id, title: srcSourceDocuments.title })
      .from(srcSourceDocuments)
      .where(sql`id = ANY(${run.sourceIds})`)

    // Check if source docs have SourceDocument graph nodes — if not, we skip DERIVED_FROM
    // (source docs ingested via Krisp don't have graph nodes yet)
    const existingSourceNodes = await db
      .select({ id: graphNodes.id })
      .from(graphNodes)
      .where(sql`id = ANY(${run.sourceIds}) AND label = 'SourceDocument'`)

    const sourceNodeSet = new Set(existingSourceNodes.map((n) => n.id))

    for (const nodeId of nodeIds) {
      for (const sourceDoc of sourceDocs) {
        if (sourceNodeSet.has(sourceDoc.id)) {
          const r = await writeEdge({
            fromNodeId: nodeId,
            toNodeId: sourceDoc.id,
            relationshipType: 'DERIVED_FROM',
            description: `Derived from analysis of "${sourceDoc.title}".`,
            source,
          })
          if (r.success) result.edgesWritten++
          else result.errors.push(`DERIVED_FROM edge: ${r.error}`)
        }
      }
    }
  }

  // Generate embedding for the processing run itself (INP-11 legacy — Phase 2 removes this)
  try {
    const analysisText = JSON.stringify(legacyRun.analysisResult).slice(0, 32000)
    const embeddingText = `${legacyRun.title ?? mode + ' analysis'} — ${analysisText}`
    const embedding = await generateEmbedding(embeddingText)
    if (embedding) {
      const vec = `[${embedding.join(',')}]`
      await db.execute(
        sql`UPDATE processing_runs SET embedding = ${vec}::vector WHERE id = ${runId}`
      )
    }
  } catch (err) {
    result.errors.push(`processing_run embedding: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Update status
  await db
    .update(processingRuns)
    .set({ status: 'committed', committedAt: new Date() })
    .where(eq(processingRuns.id, runId))

  result.success = result.errors.length === 0
  return result
}

// ---------------------------------------------------------------------------
// Batch analysis commit
// ---------------------------------------------------------------------------

async function commitBatch(
  analysis: BatchAnalysis,
  source: string,
  title: string,
  nodeIds: string[],
  result: AnalysisCommitResult
) {
  // Recurring themes → Concept nodes
  for (const theme of analysis.recurringThemes ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Concept',
      name: theme.theme,
      description: theme.description,
      source,
      properties: {
        analysisType: 'recurring_theme',
        sourceRefs: theme.sourceRefs,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Concept node "${theme.theme}": ${r.error}`)
  }

  // Synthesised insights → Idea nodes
  for (const insight of analysis.synthesisedInsights ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: insight.insight.slice(0, 200),
      description: `${insight.insight}\n\nBasis: ${insight.basis}\n\nImplication: ${insight.implication}`,
      source,
      properties: {
        subtype: 'synthesised_insight',
        sourceRefs: insight.sourceRefs,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (insight): ${r.error}`)
  }

  // Convergences → Idea nodes
  for (const conv of analysis.convergences ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: conv.point.slice(0, 200),
      description: `Convergence: ${conv.description}`,
      source,
      properties: {
        subtype: 'convergence',
        sourceRefs: conv.sourceRefs,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (convergence): ${r.error}`)
  }

  // Divergences → Idea nodes
  for (const div of analysis.divergences ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: div.point.slice(0, 200),
      description: `Divergence: ${div.description}`,
      source,
      properties: {
        subtype: 'divergence',
        sourceRefs: div.sourceRefs,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (divergence): ${r.error}`)
  }

  // Gaps → Idea nodes
  for (const gap of analysis.gaps ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: gap.gap.slice(0, 200),
      description: `Knowledge gap: ${gap.description}`,
      source,
      properties: { subtype: 'gap' },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (gap): ${r.error}`)
  }
}

// ---------------------------------------------------------------------------
// Reflective analysis commit
// ---------------------------------------------------------------------------

async function commitReflective(
  analysis: ReflectiveAnalysis,
  source: string,
  title: string,
  nodeIds: string[],
  result: AnalysisCommitResult
) {
  // Emerging themes → Concept nodes
  for (const theme of analysis.emergingThemes ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Concept',
      name: theme.theme,
      description: `Emerging theme: ${theme.trajectory}`,
      source,
      properties: {
        analysisType: 'emerging_theme',
        sourceRefs: theme.sourceRefs,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Concept node "${theme.theme}": ${r.error}`)
  }

  // Key realisations → Idea nodes
  for (const real of analysis.keyRealisations ?? []) {
    const id = randomUUID()
    const sources = (real.sourceRefs ?? []).join(', ')
    const r = await writeNode({
      id,
      label: 'Idea',
      name: real.realisation.slice(0, 200),
      description: `${real.realisation}\n\nSignificance: ${real.significance}${sources ? `\n\nSources: ${sources}` : ''}`,
      source,
      properties: {
        subtype: 'realisation',
        sourceRefs: real.sourceRefs ?? [],
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (realisation): ${r.error}`)
  }

  // Shifts in thinking → Idea nodes
  for (const shift of analysis.shiftsInThinking ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: shift.shift.slice(0, 200),
      description: `Shift in thinking: from "${shift.from}" to "${shift.to}".${shift.trigger ? ` Triggered by: ${shift.trigger}` : ''}`,
      source,
      properties: {
        subtype: 'shift',
        from: shift.from,
        to: shift.to,
        trigger: shift.trigger,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (shift): ${r.error}`)
  }
}

// ---------------------------------------------------------------------------
// Project synthesis commit
// ---------------------------------------------------------------------------

async function commitSynthesis(
  analysis: ProjectSynthesis,
  source: string,
  title: string,
  nodeIds: string[],
  result: AnalysisCommitResult
) {
  // Methodology → Methodology node
  if (analysis.methodology) {
    const id = randomUUID()
    const stepsText = (analysis.methodology.steps ?? [])
      .map((s, i) => `${i + 1}. ${s.step}: ${s.description}`)
      .join('\n')
    const r = await writeNode({
      id,
      label: 'Methodology',
      name: `${analysis.projectName} methodology`,
      description: `${analysis.methodology.overview}\n\nSteps:\n${stepsText}`,
      source,
      properties: {
        projectName: analysis.projectName,
        steps: analysis.methodology.steps,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Methodology node: ${r.error}`)
  }

  // Reusable patterns → Concept nodes
  for (const pattern of analysis.reusablePatterns ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Concept',
      name: pattern.pattern,
      description: `${pattern.description}\n\nApplicability: ${pattern.applicability}`,
      source,
      properties: {
        analysisType: 'reusable_pattern',
        projectName: analysis.projectName,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Concept node (pattern): ${r.error}`)
  }

  // Content angles → Idea nodes with subtype content-angle
  for (const angle of analysis.contentAngles ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: angle.angle.slice(0, 200),
      description: `Content angle: ${angle.angle}\nAudience: ${angle.audience}\nWhy it resonates: ${angle.whyItResonates}`,
      source,
      properties: {
        subtype: 'content-angle',
        audience: angle.audience,
        projectName: analysis.projectName,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (content angle): ${r.error}`)
  }

  // What worked → Idea nodes
  for (const item of analysis.whatWorked ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: item.approach.slice(0, 200),
      description: `What worked: ${item.approach}\n\nEvidence: ${item.evidence}`,
      source,
      properties: {
        subtype: 'what_worked',
        sourceRefs: item.sourceRefs,
        projectName: analysis.projectName,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (what worked): ${r.error}`)
  }

  // What didn't work → Idea nodes
  for (const item of analysis.whatDidntWork ?? []) {
    const id = randomUUID()
    const r = await writeNode({
      id,
      label: 'Idea',
      name: item.approach.slice(0, 200),
      description: `What didn't work: ${item.approach}\n\nWhat happened: ${item.whatHappened}\n\nLesson: ${item.lesson}`,
      source,
      properties: {
        subtype: 'what_didnt_work',
        projectName: analysis.projectName,
      },
    })
    if (r.success) { result.nodesWritten++; nodeIds.push(id) }
    else result.errors.push(`Idea node (what didn't work): ${r.error}`)
  }
}
