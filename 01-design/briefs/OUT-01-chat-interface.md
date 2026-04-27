# Chat Interface Brief
Feature ID: OUT-01
Status: complete
Last updated: 2026-04-22

## Summary

Conversational interface with full access to all storage layers — the primary way to query knowledge, discuss strategy, generate ad-hoc content, and (eventually) take actions on data. Backend streaming route and retrieval tools already exist; this brief covers the frontend UI, conversation persistence, nav restructure, and the slide-out drawer for contextual chat from any page.

## Nav restructure

The current "Content" nav group becomes **"Ask BigBrain"** — the output/interaction section of the app.

| Before | After |
|---|---|
| Content → Create | Ask BigBrain → Chat (new) |
| Content → Inbox | Ask BigBrain → Create |
| | Ask BigBrain → Library (future — replaces old Inbox) |

"Inbox" under Content is removed. Future additions under "Ask BigBrain": Design (Affinity MCP), Campaigns, etc.

## Use cases

### UC-1: Open-ended knowledge query (primary)
- **Who:** Ellie
- **When:** Wants to explore what she knows about a topic, find connections, recall insights
- **Example:** "What do I know about reshoring?" / "What themes came up across my mastermind calls?"
- **System:** LLM calls retrieval tools (`search_knowledge`, `explore_graph`), presents findings with source attribution

### UC-2: Strategy discussion
- **Who:** Ellie
- **When:** Thinking through positioning, audience, offers, content strategy
- **Example:** "Help me rethink my positioning for scale-up CEOs" / "How does my value prop hold up against competitor X?"
- **System:** LLM loads relevant DNA via `get_brand_dna`, discusses, may draft updates

### UC-3: Ad-hoc content generation
- **Who:** Ellie
- **When:** Wants a quick piece of content without going through the structured content creator
- **Example:** "Write me a LinkedIn post about the Messy Middle for my innovator audience"
- **System:** LLM loads tone of voice, audience segment, relevant knowledge; generates content in-chat

### UC-4: Image/screenshot discussion
- **Who:** Ellie
- **When:** Wants to discuss a screenshot, competitor page, design mockup, or visual reference
- **Example:** Pastes a screenshot of a competitor's landing page — "What's their positioning here and how does it compare to mine?"
- **System:** Image sent to LLM as vision input alongside the text message

### UC-5: Action drafts (v1 — read + draft, no writes)
- **Who:** Ellie
- **When:** Asks the LLM to update strategy, extract stats, create a new DNA item
- **Example:** "Update my value proposition to emphasise the research angle"
- **System:** LLM drafts the change and presents it for approval. In v1, the user manually applies it. In v1.1+, the LLM can write to the DB on user confirmation.

### UC-6: Contextual chat from any page (drawer)
- **Who:** Ellie
- **When:** On a DNA page, source review, or anywhere in the app — wants to ask a question without leaving
- **Example:** On the audience segments page, opens drawer: "What content angles work best for this segment?"
- **System:** Same chat backend; drawer shares conversation state with the full chat page

## User journey

### Full chat page (`/chat`)
1. User clicks "Chat" under "Ask BigBrain" in the sidebar nav
2. **Left panel:** conversation history list (title, date, preview snippet). Most recent first. Click to load.
3. **Main area:** message thread — user messages right-aligned, assistant messages left-aligned (Claude.ai style)
4. **Bottom:** input area with text field, image attach button, send button. Supports Enter to send, Shift+Enter for newline.
5. User types a message → message appears immediately → streaming response begins
6. During tool calls, a status indicator shows what the LLM is doing (e.g. "Searching knowledge for 'reshoring'...")
7. Response streams in with full markdown rendering (headings, lists, bold, code blocks, links)
8. Conversation auto-titled by LLM after first exchange

### Slide-out drawer (from any page)
1. User clicks a persistent chat trigger button (bottom-right corner or top toolbar)
2. Drawer slides in from the right — ~440px wide, overlays the page (does not push content)
3. Contains: conversation list toggle, message thread, input area — same functionality as full page, compressed layout
4. "Open in full view" link at top navigates to `/chat` with the current conversation loaded
5. Close button (X) or click outside to dismiss
6. Drawer state persists within a session — re-opening shows the same conversation

### New conversation
1. "New chat" button (top of conversation list or prominent in empty state)
2. Starts with an empty thread and focused input
3. First message + first response triggers auto-title generation

## Data model

### `conversations` table
| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK, default `gen_random_uuid()` | |
| `brand_id` | uuid | yes | FK → `brands.id` | Scoped to brand |
| `title` | text | no | max 200 chars | Auto-generated after first exchange; nullable until then |
| `created_at` | timestamp | yes | default `now()` | |
| `updated_at` | timestamp | yes | default `now()`, updated on new message | |
| `archived_at` | timestamp | no | | Soft delete — archived conversations hidden from list but not destroyed |
| `parent_message_id` | uuid | no | FK → `messages.id` | v2 branching: the message this conversation branches from |

### `messages` table
| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK, default `gen_random_uuid()` | |
| `conversation_id` | uuid | yes | FK → `conversations.id`, cascade delete | |
| `role` | text | yes | `'user'` or `'assistant'` | |
| `content` | text | yes | | Full message text. For assistant messages, this is the final rendered content. |
| `attachments` | jsonb | no | | Array of `{ type, url, name, size }` for images/files |
| `tool_calls` | jsonb | no | | Array of tool invocations for this message (name, args, result summary). For UI display of "what the LLM did". |
| `created_at` | timestamp | yes | default `now()` | |
| `token_count` | integer | no | | Optional — for future cost tracking |

**Indexes:**
- `messages.conversation_id` + `created_at` (composite) — fast message loading in order
- `conversations.brand_id` + `updated_at` (composite) — conversation list sorted by recency

## Update behaviour

- **Conversations:** Freely editable title (v1.1 — manual rename). `updated_at` bumped on each new message. Soft-archivable.
- **Messages:** Immutable once created. No editing of sent messages. Branching (v2) creates a new conversation from a message point rather than editing.

## Relationships

### Knowledge graph (FalkorDB)
- No direct graph nodes for conversations in v1. The chat queries the graph but doesn't write to it.
- v1.1+: When the LLM drafts actions and the user confirms, those writes go through the existing `writeNode()` / graph write API.

### Postgres
- `conversations.brand_id` → `brands.id`
- `messages.conversation_id` → `conversations.id` (cascade delete)
- `conversations.parent_message_id` → `messages.id` (v2 branching — nullable, unused in v1)

## UI/UX notes

### Message rendering
- Assistant messages: full markdown (rendered via a markdown component — `react-markdown` or similar). Support for headings, lists, bold/italic, code blocks, links, tables.
- User messages: plain text with line breaks preserved. Images displayed inline below text.
- Tool call indicators: inline in the assistant message flow, before the response text. Subtle, collapsible. E.g. a small pill: "Searched knowledge for 'reshoring'" with expand to show what was found.

### Layout inspiration
- Claude.ai conversation layout: clean, readable, generous line spacing, left-aligned assistant messages, right-aligned user messages.
- Message width capped at ~720px for readability, centred in the main area.

### Chat input
- Multiline text area that grows with content (up to ~4 lines visible, then scrolls)
- Image attach: button opens file picker, accepts `image/*`. Preview thumbnail before send.
- Send: button + Enter shortcut. Shift+Enter for newline.
- Disabled state while assistant is responding (prevent double-send)

### Conversation list (left panel on full page)
- Title, relative timestamp ("2h ago", "Yesterday", "Apr 15")
- 1-line preview (truncated first user message or last message snippet)
- Hover: archive action (trash icon)
- Active conversation highlighted
- Collapsible panel (toggle to maximise message area)

### Slide-out drawer
- Width: ~440px
- Backdrop: subtle overlay (opacity 0.15) — page content visible but dimmed
- Animation: slide from right, ~200ms ease-out
- Header: conversation title (or "New chat"), "Open in full view" link, close button
- Compact message layout — narrower max-width, smaller text (13px body vs 14px on full page)
- Input area pinned to bottom

## Edge cases

### Empty state (no conversations)
- Full page: centred message — "Start a conversation" with a large input area and example prompts: "What do I know about...", "Help me think through...", "Write me a..."
- Drawer: same but compact

### No relevant knowledge found
- LLM responds honestly: "I don't have knowledge about X in your system yet." Then asks targeted follow-up questions to prompt the user to share context: "Would you like to tell me about X? I can help you think through it."
- v1.1+: LLM can offer to save the user's answers into the graph/DNA

### Streaming interruption
- If the user navigates away during streaming, the partial response is saved as the message content
- "Stop generating" button visible during streaming — stops the stream and saves partial content

### Long conversations
- No explicit message limit in v1. The AI SDK's `stepCountIs(5)` limits tool call rounds per turn.
- If context window pressure becomes an issue, address in v1.1 with conversation summarisation/compaction.

### Image upload failures
- If image is too large (>10MB) or wrong format, show inline error below the input. Don't send the message.
- If the LLM can't process the image (model limitation), it responds with text explaining the limitation.

## Out of scope (v1)

- **Context picker / topic bar** (UC-2 in RET-01 brief) — user-selected DNA/source items as explicit focus context. Deferred to v1.1.
- **Branching** — `parent_message_id` column exists in schema for forward-compatibility, but no UI. v2 will add: branch preview on hover (brief overview of messages), visual conversation tree with 1-2 lines of context per branch.
- **Manual conversation rename** — auto-title only in v1. Manual rename in v1.1.
- **Document upload + processing** — images work immediately (vision input). Document upload (PDF, etc.) routed through INP-03 processing pipeline deferred to v1.1.
- **Write actions** — LLM can draft changes (value prop updates, new segments, stat extraction) but cannot write to DB in v1. User applies manually. v1.1 adds confirmed writes.
- **Voice input** — text and image only in v1.
- **Conversation search** — browse by list only. Full-text search across conversations in v1.1.
- **Chat recipes / skills (OUT-01a)** — predefined operations runnable from chat. Separate feature.

## v1.1 roadmap (next iteration)

1. **Context picker** — pin DNA items, sources, or graph nodes as focus context for a conversation
2. **Manual rename** — edit conversation titles
3. **Document upload** — files routed through processing pipeline, results available in chat
4. **Confirmed write actions** — LLM drafts, shows diff, user confirms, LLM writes to DB
5. **Conversation search** — full-text search across all conversations

## v2 roadmap

1. **Branching** — create branches from any message. Branch preview shows 1-2 line summaries. Visual tree view for navigating the branch structure. UX priority: making it easy to find which branch had which discussion, not just `< 1/2 >` navigation.
2. **Voice input** — record or dictate messages
3. **Conversation compaction** — summarise long conversations to manage context window
4. **Auto-save to graph** — when the LLM asks questions and the user answers, offer to persist that knowledge

## Dependencies

| Dependency | Status | Notes |
|---|---|---|
| INF-06 (LLM layer) | done | `MODELS.primary`, streaming, AI SDK v6 |
| KG-02 (graph write API) | done | Used by `explore_graph` tool |
| RET-01 (unified retrieval) | done | All 4 tools wired in `/api/chat/route.ts` |
| VEC-01 (vector store) | done | Embeddings + similarity search |
| DASH-01 (dashboard shell) | in-progress | Nav sidebar, layout — needs nav restructure |

All hard dependencies are met. This feature is unblocked.

## Technical notes

### Existing backend
- `/api/chat/route.ts` — streaming route with auth, brand lookup, 4 retrieval tools, `stepCountIs(5)`
- `SYSTEM_PROMPTS.chat` — detailed instructions for tool usage and personality
- `createRetrievalTools(brandId)` — `search_knowledge`, `get_brand_dna`, `get_source_knowledge`, `explore_graph`

### Frontend approach
- AI SDK `useChat` hook for message state, streaming, and tool call handling
- New tables: `conversations`, `messages` (schema above)
- API changes: extend `/api/chat/route.ts` to accept `conversationId`, persist messages, handle auto-titling
- New components: `ChatMessage`, `ChatInput`, `ConversationList`, `ChatDrawer`, `ToolCallIndicator`
- Markdown rendering: `react-markdown` + `remark-gfm` for GitHub-flavoured markdown

### Nav config changes
- Rename "Content" group to "Ask BigBrain"
- Add "Chat" as first item (`/chat`, icon: `MessageSquare`)
- Rename "Create" and keep as second item
- Remove "Inbox"

## Open questions / TBDs

None — all resolved.

## Resolved questions

- **Drawer trigger placement:** Top toolbar icon (consistent with existing ideas lightbulb). Not a floating button.
- **Auto-title model:** Fast model (Haiku) — cheap, sufficient for a short summarisation task.

## Decisions log

- Brief approved 2026-04-21
- Drawer trigger: top toolbar icon (resolved during brief)
- Auto-title model: Haiku / fast model (resolved during brief)
- Layout spec approved 2026-04-22 — `01-design/wireframes/OUT-01-layout.md`
- Build complete 2026-04-22
- AI SDK v6 has no useChat hook — custom hook built using fetch + manual stream parsing
- convertToModelMessages needed to bridge UIMessage (parts) → ModelMessage (content) formats
- Image upload: data URIs stripped from UIMessage conversion, injected as inline base64 image parts directly into model messages
- Chat model temporarily switched to Gemini Pro 3.1 (Anthropic credits depleted) — revert to MODELS.primary when topped up
- Title generation uses Gemini Flash (same reason) — revert to MODELS.fast
- Dev auth bypass added to chat route + server actions (matching middleware pattern)
