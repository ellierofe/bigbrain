# ADR-008 — Skills as a chat-native primitive, separate from content-creation prompt architecture

Status: accepted
Date: 2026-04-30
Related: ADR-006 (content creation prompt architecture), OUT-01a, OUT-01b, OUT-01c, OUT-02, DNA-02

## Context

Two distinct generation needs have surfaced in the system, and we need to decide whether they are served by one primitive or two.

**Content creation (OUT-02 / ADR-006).** A prescriptive, parameter-driven pipeline. The user picks a content type, fills a Strategy panel, drills the Infinite Prompt Engine, and receives N variants. The eight-layer prompt model assembles a complete prompt from declared inputs in a single round trip. Persistence is transient (`generation_runs` with TTL) plus opt-in keepers (`library_items`). Optimised for repeatable, structured generation.

**Chat skills (OUT-01a).** A discursive, multi-turn flow that drives towards an end-goal but tolerates sidebars, doubts, clarifying questions, and mid-stream user steering. First concrete example: DNA-02 brand meaning generation — four stages of reflective conversation (problem in the world → future state → values through behaviour → drafted vision/mission/purpose) with progressive save. Future examples: DNA refresh flows, OUT-03 strategy generation, OUT-05 coherence check, ad-hoc DNA editing through chat.

The question: do skills extend the OUT-02 prompt architecture, or do they sit as a separate primitive?

## Decision

**Two distinct primitives.** Skills are discursive; content-creation pipelines are prescriptive. They serve different jobs and have different shapes.

|  | **Content-creation pipelines (ADR-006)** | **Skills (OUT-01a)** |
|---|---|---|
| Shape | Prescriptive — inputs → assembled prompt → N outputs | Discursive — multi-turn conversation driving towards an end-goal |
| Initiation | UI form (content type picker, cascade) | Chat (user opens a skill, system loads brief into system prompt) |
| State | Transient `generation_runs` + opt-in `library_items` | Conversation persists with new `skillType` + `gatheredData` fields |
| Tolerance for sidebars | None — single round-trip | High — user can ask, doubt, clarify mid-flow |
| Output | Variants for review | Saved DNA records, captured insight, structured updates |
| Reuse model | Same content type re-run with different inputs | Same skill resumable across sessions |

OUT-01a builds its own runtime — skill registry, conversation state, brief loading into the system prompt. It does not import ADR-006's `prompt_stages` or `prompt_fragments` machinery.

The two systems share infrastructure-level concerns (LLM client via `generateObjectWithFallback`, business-context loading helpers) but not the prompt-assembly layer.

## Consequences

- **OUT-01a runtime is independent of ADR-006.** The skill brief, system prompt, and stage transitions live in their own code path. No coupling to `content_types` / `prompt_stages` / `prompt_fragments`.
- **DB-write tool (OUT-01c) is owned by the skills layer.** OUT-02's "save to library" continues to use direct API calls — saves there are deterministic user-triggered UI actions, not LLM-driven, and don't need LLM tooling. OUT-01c exists to give skills (and ad-hoc chat) a safe, schema-aware way to write to DB tables under LLM control.
- **The two systems can evolve independently.** ADR-006 changes (new content types, new prompt stages) don't ripple into the skills runtime. Skills changes (new skills, new context-pane content types) don't ripple into OUT-02.
- **Mental model is preserved.** "I want to make a LinkedIn post" routes the user to the content creator. "Help me think through my brand meaning" routes them to chat. The boundary matches how the user thinks about the work.

## Future bridge (parked, not in scope)

Content-creation pipelines can become **skill-callable as tools**. A skill could invoke "the LinkedIn post pipeline" as a tool call, passing parameters it gathered conversationally. This means a LinkedIn post can be created either:

- **Prescriptively** via OUT-02's UI (current path), or
- **Conversationally** via a chat skill that gathers the parameters through dialogue and invokes the pipeline when ready.

The bridge is **one direction only**: skills can call content-creation pipelines; content-creation pipelines do not call skills. This preserves OUT-02's deterministic, repeatable shape.

This bridge requires no architectural changes to either system — it's a different *bundling* of prompt fragments inside a wider skill, rather than a one-and-done prompt. Content-creation pipelines just need a programmatic invocation path in addition to their UI invocation path when this is built.

**Parked as a future enhancement.** Do not build speculatively. Revisit when there is a concrete user need.

## Alternatives considered

1. **Unify under one primitive.** Rejected — forces either OUT-02 to take on conversational state machinery it doesn't need, or skills to take on prompt-assembly machinery they don't need. Result: both systems become more complex to satisfy a hypothetical shared abstraction.

2. **Build skills on top of OUT-02's prompt architecture.** Rejected — OUT-02's eight-layer model is optimised for assembling a complete prompt from declared inputs in one shot; skills need to evolve a system prompt across stages with mid-flight reflection and user-driven sidebars. The shapes don't fit.

3. **Defer the decision until DNA-02 reveals the shape.** Rejected — the brief order needs OUT-01a's primitive locked first, or every dependent brief becomes speculative.

## Decisions log

- 2026-04-30: ADR drafted and accepted. Skills and content-creation pipelines are separate primitives. OUT-01c owned by skills layer. Future bridge (skills calling content-creation pipelines as tools) parked.
