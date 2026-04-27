# Ideas / Quick Capture Brief
Feature ID: IDEA-01
Status: complete
Last updated: 2026-04-24

## Summary
A system-wide capture mechanism for thoughts, questions, and sparks. The lightbulb button is always visible in the top toolbar — one click opens a capture modal, type the thought, tag it if you want, move on. Ideas are lightweight placeholders, not processed inputs. They exist so tangent thoughts don't derail focus and don't get lost.

Addresses **Problem 3** (disconnected knowledge) and the ADHD-critical path described in the domain model (§6.2): "if capture has friction, ideas get lost. If triage doesn't happen, ideas pile up and create overwhelm."

Separate from graph `Idea` nodes (ADR-002) — those are extracted from processed inputs with provenance requirements. Quick-captured ideas are fragments, questions, half-formed thoughts. They can be promoted to graph Ideas later if they prove valuable.

## Use cases
- **Capture a thought mid-task:** While working on anything in the app, hit the lightbulb button, type the thought, optionally tag it to the current context (mission, project, DNA item), save. Back to what you were doing in under 10 seconds.
- **Park a tangent during research:** A question arises while investigating something — capture it rather than following it. Tagged to the current mission automatically if context is available.
- **Review captured ideas later:** Browse the ideas list, triage: shelve things that aren't useful, mark things as done that you've acted on, promote valuable ideas to graph nodes or inputs.
- **Capture from any page:** The trigger is in the app chrome, not page-specific. Works from the dashboard, a mission workspace, a DNA edit page — anywhere.

## User journey
1. User is working on any page in the app
2. User clicks the lightbulb icon in the top toolbar → capture modal opens
3. User types the thought (single text field, no formatting needed)
4. Optionally: user tags it to a mission, client project, or other context (auto-suggested based on current page if possible)
5. User clicks "Capture" (or hits Enter) → idea saved, modal closes, user is back where they were
6. Later: user navigates to the ideas list (from sidebar or a dedicated route) to review and triage

## Data model / fields

### `ideas` table (Postgres)

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK, auto-generated | |
| `brand_id` | uuid | yes | FK → brands.id | Scoped to brand |
| `text` | text | yes | | The thought, question, or spark. No length limit. |
| `type` | text | yes | enum: idea, question | Default: `idea`. Ideas are thoughts/sparks; questions are things to investigate. |
| `status` | text | yes | enum: captured, shelved, done | Default: `captured` |
| `source` | text | yes | enum: manual, ai_surfaced | Default: `manual`. AI-surfaced reserved for future use when AI can auto-create ideas. |
| `context_page` | text | no | | The route the user was on when they captured this (auto-set, e.g. `/projects/missions/[id]`) |
| `created_at` | timestamp(tz) | yes | default now | |
| `updated_at` | timestamp(tz) | yes | default now | |

### Join tables

| Join table | Columns | Notes |
|---|---|---|
| `idea_missions` | idea_id, mission_id | Tag an idea to a mission |
| `idea_projects` | idea_id, project_id (FK → client_projects.id) | Tag an idea to a client project |

All join tables include `created_at` timestamp.

**Note:** Additional join tables (to DNA items, graph nodes, content pillars, etc.) can be added as needed. Starting minimal — missions and projects are the most likely tagging contexts.

## Update behaviour
**Freely editable.** Text and status can be changed at any time. Tags can be added or removed. No version history.

## Relationships

### Knowledge graph (FalkorDB)
**None initially.** Ideas are Postgres-only. They don't create graph nodes on capture — that's the whole point of keeping them lightweight.

Future: a "Promote to graph" action creates an `Idea` node (ADR-002) from a quick-captured idea, with the original idea as provenance. This is out of scope for IDEA-01.

### Postgres
- `ideas` → `brands` (FK: brand_id)
- Join tables to: missions, client projects

## UI/UX notes

**Template check:** No match. New pattern (2026-04-23).

**Layout spec:** `01-design/wireframes/IDEA-01-layout.md` (approved 2026-04-23)

**Summary of layout decisions:**
- **Capture modal:** `sm:max-w-md` dialog with type toggle (Idea/Question) + textarea + Capture button. `⌘+Enter` shortcut. No tagging in v1. No unsaved-changes warning.
- **Ideas list:** Vertical list at `/inputs/ideas`. Two-dimensional filter pills (status + type). Inline text editing, inline status changes, optimistic delete with undo toast. Page title: "Ideas & Questions".
- **Reusable molecule:** `IdeasList` component built as a molecule with optional `contextFilter` prop — embeddable in mission/project workspaces when those land.
- **No detail view.** Ideas expand in-place for long text.
- **Type field added to data model:** `type` enum (`idea`, `question`), default `idea`.

## Edge cases
- **Empty state (no ideas):** Not shown prominently — the ideas list is secondary. Simple message: "No ideas captured yet. Use the lightbulb button to jot down thoughts as they come."
- **Very long text:** No limit, but truncate display in list view. Full text visible on click/expand.
- **Duplicate ideas:** Allowed — you might capture the same thought twice from different contexts, and that's fine. No deduplication.
- **Deleting ideas:** Status `shelved` is the soft delete. Hard delete available from the list view — removes the row. No cascading effects since ideas don't create graph nodes.
- **Modal interruption:** If the user is mid-capture and navigates away, the modal should warn (unsaved changes) or auto-save as draft. Recommend: auto-save — friction kills capture.

## Out of scope
- **Voice capture** — backlogged. Currently using SuperWhisper externally. Future: in-app audio recording + transcription for voice ideas. Separate feature.
- **AI-generated ideas** — backlogged. Future: AI skills that traverse the graph or analyse data could auto-create ideas (with `source: ai_surfaced`). The `source` field is ready for this.
- **"Select text → add as idea" from AI chat responses** — backlogged. Future UX enhancement for M3+ chat.
- **Promote to graph** — future action that creates an `Idea` node (ADR-002) from a quick-captured idea. The data model supports it (ideas have text and context); the action itself is out of scope.
- **Notifications / reminders** — no "you have N unreviewed ideas" nudges. Review is self-directed.
- **Rich text / formatting** — plain text only. Ideas are fragments, not documents.

## Dependencies
- **DASH-01** (dashboard shell) — the top toolbar lives in the dashboard layout
- **CLIENT-01** (client projects) — optional join table. Can be built in parallel.
- **MISSION-01** (missions) — optional join table. Can be built in parallel.

## Open questions / TBDs
- [x] **Ideas list route:** Tab within Inputs section at `/inputs/ideas`, alongside the existing `/inputs/queue`. Decided 2026-04-14.
- [ ] **Auto-context detection:** How reliably can we detect what the user is "in" (which mission, which project) from the current route? App Router paths like `/projects/missions/[id]` make this straightforward. DNA pages less so.
- [ ] **Keyboard shortcut:** Should there be a hotkey for quick capture (e.g. `⌘+I` or similar)? Likely yes, but deferred to implementation.

## Decisions log
- Brief approved 2026-04-14
- Ideas list lives as tab in Inputs section at `/inputs/ideas` (2026-04-14)
- Layout spec approved 2026-04-23. Added `type` field (idea/question) with toggle in capture modal and filter pills on list. IdeasList built as reusable molecule for future embedding in project/mission workspaces.
- Build complete 2026-04-24. Polymorphic `idea_tags` table replaces per-entity join tables — any entity type (mission, client_project, offer, knowledge_asset, audience_segment) can be tagged from the ideas list. `IdeasPanel` molecule embeds the full experience in workspaces with a "This [entity]" / "All ideas" tab split and one-click Link button for context tagging. Capture modal auto-tags to current context when invoked from an embedded panel. Mission and client project workspaces now use IdeasPanel (replaces the stub and read-only views respectively).
