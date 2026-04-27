# Session log — 2026-04-22 — OUT-01 Chat Interface
Session ID: 2026-04-22-out01-chat-build-w3k

## What we worked on
OUT-01 (Chat interface) — end-to-end from brief through layout design to complete build.

## What was done

### Feature brief (SKL-01)
- Wrote and approved brief: `01-design/briefs/OUT-01-chat-interface.md`
- Key decisions during brief: nav restructure ("Content" → "Ask BigBrain"), slide-out drawer from top toolbar (not floating button), auto-title via fast model, image attach in v1 but document upload deferred to v1.1, branching deferred to v2 with UX notes captured

### Layout design (SKL-02)
- Full layout spec: `01-design/wireframes/OUT-01-layout.md`
- New pattern established: `chat-conversation` (no existing template match)
- Key layout decisions: full-bleed page (no PageHeader/ContentPane), history panel 280px collapsible, Claude.ai-style message rendering, tool call pills above responses, 440px drawer overlay

### Build (SKL-04)

**Database:**
- New tables: `conversations`, `messages` — `02-app/lib/db/schema/chat.ts`
- Migration 0013 generated and applied
- Schema barrel updated: `02-app/lib/db/schema/index.ts`

**Backend:**
- Query layer: `02-app/lib/db/queries/chat.ts` — getConversations, getMessages, createConversation, addMessage, archiveConversation, touchConversation, getFirstUserMessage
- Server actions: `02-app/app/actions/chat.ts` — createConversation, archive, generateTitle (with dev auth bypass)
- API route updated: `02-app/app/api/chat/route.ts` — message persistence in onFinish, conversation creation, auto-title generation, image handling (inline base64), dev auth bypass, `convertToModelMessages` to bridge UIMessage → ModelMessage format

**Custom chat hook:**
- `02-app/lib/chat/use-chat.ts` — built from scratch because AI SDK v6 removed `useChat`. Uses fetch + manual stream parsing of newline-delimited JSON chunks from `toUIMessageStreamResponse()`.

**Components (7 new, all registered):**
- `MarkdownRenderer` — react-markdown + remark-gfm with design system styles
- `ToolCallIndicator` — collapsible pill with per-tool icons
- `ChatMessage` — user bubble / assistant flat message renderer
- `ChatInput` — auto-growing textarea, image attach, send/stop, pendingValue for prompt starters
- `PromptStarter` — clickable prompt suggestion chip
- `ConversationList` — history panel with date grouping, collapse, archive
- `ChatDrawer` — slide-out overlay with motion animation

**Pages:**
- `02-app/app/(dashboard)/chat/page.tsx` — empty state / new conversation
- `02-app/app/(dashboard)/chat/[id]/page.tsx` — loads conversation + history
- `02-app/app/(dashboard)/chat/chat-area.tsx` — main client component

**Nav + home page:**
- `lib/nav-config.ts` — "Content" → "Ask BigBrain" with Chat + Create items, Inbox removed
- `components/top-toolbar.tsx` — chat drawer trigger icon added
- `app/(dashboard)/page.tsx` — Chat quick action enabled

**Dependencies added:** react-markdown, remark-gfm

### Bugs fixed during testing
1. Auth 401 in dev — added `process.env.NODE_ENV !== 'development'` bypass to chat route + server actions
2. Message format mismatch — `streamText` expects ModelMessages (content), not UIMessages (parts). Added `convertToModelMessages()` call.
3. `convertToModelMessages` returns a Promise — needed `await`
4. Nested button hydration error — conversation list item changed from `<button>` to `<div role="button">`
5. Image upload crash (data: URI not http/https) — stripped file parts before `convertToModelMessages`, injected images as inline base64 directly into model messages
6. Prompt starters sending immediately — added `pendingValue` prop to ChatInput so starters populate the input box instead

## Decisions made
- **AI SDK v6 has no useChat hook** — built custom hook from scratch using fetch + manual stream parsing. If the SDK re-adds a React hook in future, this could be simplified.
- **Dev auth bypass** — chat route and server actions now skip auth in development, matching the existing middleware pattern. All other API routes still have inline auth checks (not changed — noted for consistency pass later).
- **Model temporarily switched to Gemini Pro 3.1** — Anthropic credits depleted. Revert `MODELS.geminiPro` → `MODELS.primary` and `MODELS.geminiFlash` → `MODELS.fast` in `app/api/chat/route.ts` when topped up.
- **Prompt starters populate input, don't send** — user feedback during testing. Changed from immediate send to populating the text box with focus.

## What came up that wasn't planned
- The lack of `useChat` in AI SDK v6 was a significant discovery — required building a custom streaming hook. The memory file `feedback_ai_sdk_v6.md` didn't cover this (it documented tool/schema quirks, not the missing hook).
- Gemini doesn't really stream — responses arrive in chunks/bursts rather than token-by-token. This is a Gemini model behaviour, not a code issue. Will verify true streaming when Anthropic credits are available.

## Backlog status changes
| Feature | Before | After |
|---|---|---|
| OUT-01 | planned | done |

## What's next
- **Revert to Anthropic models** when credits are topped up — two lines in `app/api/chat/route.ts`
- **M3 is complete** — next milestone is M4 (Dashboard and DNA editing): DASH-01 completion, DASH-02, DNA-02 through DNA-08, CLIENT-01, MISSION-01, IDEA-01
- **DS-01 / UX-06** still block further DNA page builds — design system consistency pass needed before DNA-04/05/07
- **GEN-01** (audience segment generation) is in-progress — could be a good next build target

## Context for future sessions
- The custom chat hook (`lib/chat/use-chat.ts`) parses the `toUIMessageStreamResponse()` output as newline-delimited JSON. If the AI SDK changes its stream format, this will break. The `applyChunk()` function handles text and tool-invocation chunk types — new part types would need adding.
- Conversation list does N+1 queries (getFirstUserMessage per conversation for previews). Fine for now but consider denormalizing if conversation count grows significantly.
- The chat page uses negative margins (`-mx-8 -mb-8 -mt-2`) to break out of the dashboard layout padding for full-bleed. This works but is fragile — if layout padding changes, these values need updating.
- `chat-area.tsx` has some appearance classes in the organism layer (empty state, structural borders) — flagged as acceptable for v1, all using tokens. Could extract a `ChatEmptyState` molecule later.
