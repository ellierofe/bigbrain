# Session log — 2026-04-30 — OUT-01a foundation
Session ID: 2026-04-30-out01a-foundation-r4k

## What we worked on

DNA-02 singular DNA generation — initially scoped as a brand meaning generation
flow brief. Mid-questionnaire, the user introduced a chat-skills primitive that
reframed the work entirely. Pivoted to building the foundation: ADR-008,
backlog restructure (OUT-01a/b/c + UX-14), and OUT-01a feature brief.

No code touched this session. All work is documentation, decisions, and brief
authoring.

## What was done

### ADR-008 — skills vs content-creation architecture (new)
File: `00-project-management/decisions/adr-008-skills-vs-content-creation-architecture.md`

Locks the decision that **skills are a separate primitive** from OUT-02's
content-creation prompt architecture (ADR-006). Two distinct shapes:
- Content creation: prescriptive, parameter-driven, single round-trip, transient
  `generation_runs` + opt-in `library_items`
- Skills: discursive, multi-turn, conversation-persistent via new `skill_id` +
  `skill_state` on `conversations`

Future bridge ("skills can call content-creation pipelines as tools") is
explicitly parked. OUT-01c (DB-write tool) is owned by skills layer; OUT-02's
saves continue using direct API calls.

### Backlog restructure
File: `00-project-management/backlog.md`

- **OUT-01a rewritten in place** — was "Chat recipes / skills" (M, output);
  now "Chat skills infrastructure" (L, cross). Old narrow "predefined
  operations" framing subsumed by the broader skills primitive.
- **OUT-01b added** — Adaptive chat context pane (M, output). Pluggable
  right-side pane in chat UI; v1 ships skill state summary, framework supports
  more.
- **OUT-01c added** — LLM database write tool (M, cross). Schema-aware
  LLM-callable tool for DNA writes. Reusable across skills and ad-hoc chat.
- **UX-14 added** — Generation gating (S, cross). App-level rules for which
  DNA can be generated based on what upstream DNA exists.
- **DNA-02 status updated** — AI generation flows now blocked on
  OUT-01a/b/c + UX-14 (the foundation re-architecture).
- **Feature count table** — Output 8→10, Cross-cutting 2→3, Total 65→68
  (Planned 61→64).

### OUT-01a feature brief (approved)
File: `01-design/briefs/OUT-01a-chat-skills-infrastructure.md`

Full brief with status `approved`. Covers:
- Skill format: `lib/skills/<id>/` directory with `brief.md` + `index.ts` adapter
- Registry: code-backed `Record<string, Skill>`, no DB table in v1
- Universal checklist primitive (advisory in discursive mode, gated in staged mode)
- Sub-agents as the tool abstraction (`retrieval_bot` v1, `db_update_bot`
  via OUT-01c)
- `conversations.skill_id` (text, nullable) + `conversations.skill_state` (jsonb)
- One skill per conversation; resumable; brief version pinned at creation
- v1 ships with `hello-world` test fixture, not a real skill
- Out of scope: context pane (OUT-01b), DB-write sub-agent (OUT-01c),
  specific skills (DNA-02 etc.), in-app skill builder, voice, branching

## Decisions made

### Architectural (ADR-008)
- Skills and content-creation pipelines are separate primitives — see ADR-008
  for context, decision, and consequences.

### Skills runtime (locked in OUT-01a brief)
- **Universal checklist:** every skill has one, regardless of mode. Discursive
  mode = advisory; staged mode = enforced gates. Same data structure, different
  enforcement. (User insight — collapsed two modes into one shape.)
- **Sub-agents over per-skill tool lists:** real sub-LLM calls
  (option a from the brief discussion), not persona-switching. Each skill
  declares which sub-agents it can invoke.
- **Code-backed registry for v1:** `Record<string, Skill>` exported from
  `lib/skills/registry.ts`. Future DB-backed `skills` table (for user-authored
  skills) parked but anticipated — column type is `text` not FK so it's
  forward-compatible.
- **One skill per conversation, no mid-flow switching:** keeps `skill_state`
  semantically clean. Switching = new conversation.
- **Skill replaces baseline system prompt:** the skill brief carries everything
  the LLM needs in-skill mode. Baseline chat instructions don't apply.
- **Brief version pinning:** informational in v1 (latest brief used on resume);
  true reproducibility deferred until a real incident motivates it.
- **Hello-world as v1 test fixture:** not brand meaning. Keeps OUT-01a's blast
  radius bounded; brand meaning lands once OUT-01b and OUT-01c also ship.

## What came up that wasn't planned

- **The whole pivot.** Started the session orienting on DNA-02 brand meaning.
  During feature-brief Q&A, the user introduced the skills primitive
  ("specialists", "recipes" → unified as skills). This forced a stop on the
  in-progress brief and restructure of the foundational work.
- **Sub-agents as a first-class abstraction.** Not in any prior backlog entry.
  Surfaced from the user's "I used to have a 'database' agent that could save
  things" comment. Now load-bearing in OUT-01a (and renames OUT-01c from
  "tool" to "sub-agent"). Worth tracking — the term `db_update_bot` appears in
  the OUT-01a brief but OUT-01c's brief will need to formalise the sub-agent
  contract.
- **Universal checklist instead of two modes.** I'd drafted discursive vs
  staged as two different state shapes. User pointed out all skills have
  goals that can be broken down — the difference is enforcement, not
  structure. Collapsed into one shape; cleaner architecture.

## Backlog status changes

- **OUT-01a:** `planned` → **in-progress** (brief approved 2026-04-30). Scope
  rewritten from "Chat recipes / skills" to "Chat skills infrastructure".
- **OUT-01b:** *new* — `planned` (Adaptive chat context pane).
- **OUT-01c:** *new* — `planned` (LLM database write tool).
- **UX-14:** *new* — `planned` (Generation gating).
- **DNA-02:** status note updated — AI generation flows now blocked on
  OUT-01a/b/c + UX-14.

No other features touched.

## What's next

Foundation queue, in dependency order:

1. **OUT-01b** feature-brief — Adaptive chat context pane. Renders the
   skill state (checklist, gathered) that OUT-01a stores. v1 contract:
   pluggable right-side pane in chat with one content type (skill state
   summary). Built so it's adaptive, not exhaustive.
2. **OUT-01c** feature-brief — DB-write sub-agent. Formalises the sub-agent
   contract introduced in OUT-01a. Schema-aware writes to DNA tables.
   Security-sensitive — needs scoping rules and confirmation contract worked
   out at brief time.
3. **UX-14** feature-brief — Generation gating rules. Can run in parallel
   with the others — independent.
4. **DNA-02 brand meaning** feature-brief — first real skill, lands once
   foundation is in place.

User said they'll start a new session for OUT-01b's brief — context budget
running low here.

## Context for future sessions

### What's locked architecturally
- **ADR-008** is the single source of truth for the skills-vs-content-creation
  question. Read it before touching either OUT-01a or OUT-02 architecture.
- **Sub-agents** are real sub-LLM calls (focused system prompt + small tool
  surface) invoked by the main chat LLM as if they were tools. Not personas,
  not tool groups. This is load-bearing for OUT-01c's brief.
- **Universal checklist** is the canonical state primitive. When briefing
  OUT-01b, render the checklist directly (advisory display); the gating
  behaviour is invisible to the rendering layer.

### What's deliberately deferred
- Brand meaning's 4-stage flow design is fully specced in
  `01-design/briefs/DNA-02-singular-dna-intake.md` — that doc stays as the
  reference even though the architecture above it has changed.
- DNA-02's existing CRUD work (auto-saving edit views) stays as it is. Only
  the AI generation half is blocked on the foundation.
- "Skills calling content-creation pipelines" bridge: parked. Don't reopen
  unless a concrete user need surfaces.

### Working-tree hygiene note
At session start, the tree had ~10 modified/untracked files from other
sessions (OUT-02 phase 3 seeds, offer polish in other windows). This session
only commits its own files (ADR-008, OUT-01a brief, backlog updates, this
session log). The other work stays unstaged for those sessions to commit
themselves.

### State of the foundation queue
- ✅ ADR-008 accepted
- ✅ OUT-01a brief approved
- ⏳ OUT-01b brief
- ⏳ OUT-01c brief
- ⏳ UX-14 brief
- ⏳ DNA-02 brand meaning brief (final consumer)

### Skills used this session
- `feature-brief` × 2 — first attempt (DNA-02 brand meaning) was abandoned
  mid-questionnaire when the architecture pivoted; second attempt (OUT-01a)
  ran clean from re-loaded context through to approval.
- `feature-request` — used implicitly via direct backlog edits (4 entries).
  The skill itself wasn't invoked because the entries were drafted
  conversationally and confirmed before writing. Worth noting: the
  bulk-confirm pattern worked but isn't quite what SKL-11 specifies.

### Skill self-improvement note
`feature-brief`'s "conversational context shortcut" (Step B) worked well on
the second attempt — re-cutting questions to genuine gaps after the user
had already framed the architecture. No SKILL.md changes proposed.
