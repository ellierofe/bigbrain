import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import {
  getEntityWrites,
  WRITES_BY_ENTITY,
  entityBreadcrumb,
  entityShortLabel,
  type WriteEntityType,
  type SingularEntityWrites,
  type PluralEntityWrites,
} from '@/lib/db/writes'
import { insertPendingWrite } from '@/lib/db/queries/pending-writes'
import type { SkillCtx } from '@/lib/skills/types'

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

const SingularUpdateInput = z.object({
  field: z.string().describe('The exact field name (camelCase) per the schema.'),
  value: z.unknown().describe('The new value for the field. Type per the schema.'),
})

const PluralUpdateInput = z.object({
  id: z.string().uuid().describe('UUID of the existing row to update.'),
  field: z.string().describe('The exact field name (camelCase).'),
  value: z.unknown().describe('The new value for the field.'),
})

const PluralCreateInput = z.object({
  payload: z
    .record(z.string(), z.unknown())
    .describe('Full row payload. Required fields must be present per the schema.'),
})

const AudienceSegmentGenerateInput = z.object({
  roleContext: z.string().describe('Who they are / their job + working context, in 1–2 sentences.'),
  biggestProblem: z.string().optional().describe('The single most acute pain point, if known.'),
  biggestDesire: z.string().optional().describe('What they want most, if known.'),
})

// ---------------------------------------------------------------------------
// Pending-write proposal helpers
// ---------------------------------------------------------------------------

interface UpdateProposalArgs {
  conversationId: string
  entityType: WriteEntityType
  entityId: string | null
  field: string
  before: unknown
  after: unknown
}

async function proposeUpdate(args: UpdateProposalArgs): Promise<string> {
  const row = await insertPendingWrite({
    conversationId: args.conversationId,
    entityType: args.entityType,
    entityId: args.entityId,
    op: 'update',
    payload: { field: args.field, before: args.before, after: args.after },
    status: 'pending',
  })
  return formatProposal(
    `update ${entityBreadcrumb(args.entityType)}'s "${args.field}"`,
    row.id
  )
}

async function proposeCreate(args: {
  conversationId: string
  entityType: WriteEntityType
  rawPayload: Record<string, unknown>
  fields: { label: string; value: unknown }[]
}): Promise<string> {
  const row = await insertPendingWrite({
    conversationId: args.conversationId,
    entityType: args.entityType,
    entityId: null,
    op: 'create',
    payload: { rawPayload: args.rawPayload, fields: args.fields },
    status: 'pending',
  })
  return formatProposal(`create a new ${entityShortLabel(args.entityType)}`, row.id)
}

async function proposeGenerate(args: {
  conversationId: string
  entityType: WriteEntityType
  seedSummary: string
  seedInputs: Record<string, unknown>
}): Promise<string> {
  const row = await insertPendingWrite({
    conversationId: args.conversationId,
    entityType: args.entityType,
    entityId: null,
    op: 'generate',
    payload: { seedSummary: args.seedSummary, seedInputs: args.seedInputs },
    status: 'pending',
  })
  return formatProposal(
    `generate a new ${entityShortLabel(args.entityType)} from a seed`,
    row.id
  )
}

function formatProposal(action: string, pendingId: string): string {
  return `Proposed: ${action}. Awaiting user confirmation in the pending-writes pane (id: ${pendingId}).`
}

function formatError(reason: string): string {
  return `[db_update_bot] cannot propose: ${reason}`
}

// ---------------------------------------------------------------------------
// Build all tools for the sub-agent
// ---------------------------------------------------------------------------

export function createDbUpdateTools(ctx: SkillCtx) {
  // The AI SDK `tool` helper produces strongly-typed Tool<I, O> values; the
  // dynamic record shape varies per entity, so we widen to `any` here. Each
  // tool's input is still enforced by its own zodSchema at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {}

  for (const entityType of Object.keys(WRITES_BY_ENTITY) as WriteEntityType[]) {
    const writes = getEntityWrites(entityType)

    if (writes.isSingular) {
      tools[`update_${entityType}`] = makeSingularUpdate(entityType, writes, ctx)
    } else {
      tools[`update_${entityType}`] = makePluralUpdate(entityType, writes, ctx)
      if (writes.create) {
        tools[`create_${entityType}`] = makePluralCreate(entityType, writes, ctx)
      }
      if (entityType === 'dna_audience_segment') {
        tools[`request_${entityType}_generation`] = makeGenerateRequest(entityType, ctx)
      }
    }
  }

  return tools
}

function makeSingularUpdate(
  entityType: WriteEntityType,
  writes: SingularEntityWrites,
  ctx: SkillCtx
) {
  return tool({
    description: `Propose an update to ${entityBreadcrumb(entityType)}. Singular entity: auto-creates the row on first write. The proposal is staged in the pending-writes pane for the user to confirm.`,
    inputSchema: zodSchema(SingularUpdateInput),
    execute: async (input) => {
      try {
        if (!writes.WRITABLE_FIELDS.has(input.field)) {
          return formatError(
            `field '${input.field}' is not writable on ${entityType}. Pick from: ${[...writes.WRITABLE_FIELDS].join(', ')}`
          )
        }
        const before = await writes.getCurrentValue(ctx.brandId, input.field)
        const entityId = await writes.getCurrentRowId(ctx.brandId)
        return await proposeUpdate({
          conversationId: ctx.conversationId,
          entityType,
          entityId,
          field: input.field,
          before,
          after: input.value,
        })
      } catch (err) {
        return formatError(err instanceof Error ? err.message : String(err))
      }
    },
  })
}

function makePluralUpdate(
  entityType: WriteEntityType,
  writes: PluralEntityWrites,
  ctx: SkillCtx
) {
  return tool({
    description: `Propose an update to one ${entityShortLabel(entityType)} row by id. The proposal is staged in the pending-writes pane for the user to confirm. ${entityType === 'dna_offer' ? 'NOTE: offer creation is skill-shaped — only updates are supported via this tool.' : ''}`,
    inputSchema: zodSchema(PluralUpdateInput),
    execute: async (input) => {
      try {
        if (!writes.WRITABLE_FIELDS.has(input.field)) {
          return formatError(
            `field '${input.field}' is not writable on ${entityType}. Pick from: ${[...writes.WRITABLE_FIELDS].join(', ')}`
          )
        }
        const before = await writes.getCurrentValue(input.id, input.field)
        return await proposeUpdate({
          conversationId: ctx.conversationId,
          entityType,
          entityId: input.id,
          field: input.field,
          before,
          after: input.value,
        })
      } catch (err) {
        return formatError(err instanceof Error ? err.message : String(err))
      }
    },
  })
}

function makePluralCreate(
  entityType: WriteEntityType,
  _writes: PluralEntityWrites,
  ctx: SkillCtx
) {
  return tool({
    description: `Propose creating a new ${entityShortLabel(entityType)} with a full payload. The proposal is staged in the pending-writes pane. Use this when the conversation has gathered all required fields. For audience segments, use request_dna_audience_segment_generation when only seed inputs are known.`,
    inputSchema: zodSchema(PluralCreateInput),
    execute: async (input) => {
      try {
        const fields = Object.entries(input.payload).map(([label, value]) => ({ label, value }))
        return await proposeCreate({
          conversationId: ctx.conversationId,
          entityType,
          rawPayload: input.payload,
          fields,
        })
      } catch (err) {
        return formatError(err instanceof Error ? err.message : String(err))
      }
    },
  })
}

function makeGenerateRequest(entityType: WriteEntityType, ctx: SkillCtx) {
  return tool({
    description: `Propose creating a new ${entityShortLabel(entityType)} via the generation pipeline (seed inputs only — the system fills in the rest). Use this when only minimal info is known. The proposal is staged in the pending-writes pane.`,
    inputSchema: zodSchema(AudienceSegmentGenerateInput),
    execute: async (input) => {
      try {
        const seedSummary = [
          `Role / context: ${input.roleContext}`,
          input.biggestProblem ? `Biggest problem: ${input.biggestProblem}` : null,
          input.biggestDesire ? `Biggest desire: ${input.biggestDesire}` : null,
        ]
          .filter(Boolean)
          .join('\n')

        return await proposeGenerate({
          conversationId: ctx.conversationId,
          entityType,
          seedSummary,
          seedInputs: input,
        })
      } catch (err) {
        return formatError(err instanceof Error ? err.message : String(err))
      }
    },
  })
}
