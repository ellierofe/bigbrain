# Layout Spec: OUT-01 Chat Interface
Status: approved
Last updated: 2026-04-22
Template: establishes `chat-conversation` pattern (new pattern — no existing match)

---

## Template check result
No applicable template found. OUT-01 is a conversational streaming UI with conversation history, tool call visibility, and a slide-out drawer mode. Structurally distinct from all existing patterns (DNA plural-item CRUD, input-process pipeline). This spec establishes the `chat-conversation` pattern.

---

## Views

| View | Purpose | When it appears |
|---|---|---|
| Full chat page | Primary chat experience — conversation history + message thread | `/chat` via "Ask BigBrain → Chat" nav |
| Slide-out drawer | Contextual chat from any page | Triggered from top toolbar icon, overlays current page |
| Empty state | First-time or no-conversations landing | When no conversations exist |

---

## Navigation and routing

### Nav restructure
The "Content" nav group is renamed to **"Ask BigBrain"** with icon `BrainCircuit`.

| Item | Route | Icon | Notes |
|---|---|---|---|
| Chat | `/chat` | `MessageSquare` | New — primary item |
| Create | `/content/create` | `Sparkles` | Existing, moved from Content |

"Inbox" is removed entirely. "Library" may be added in a future iteration.

### Routes
- `/chat` — full chat page. If conversations exist, loads the most recent. If empty, shows empty state with prompt starters.
- `/chat/[id]` — deep link to a specific conversation. Loads that conversation in the main area with history panel visible.

### Entry points
1. Sidebar nav: "Ask BigBrain → Chat"
2. Top toolbar: chat icon (opens slide-out drawer, not the full page)
3. Home page: "Chat" quick action card (currently disabled — will link to `/chat`)
4. Deep link: `/chat/[conversation-id]`

---

## Full chat page layout

### Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [NavSidebar]  │  CHAT PAGE (flex-1, no PageHeader — full-bleed)       │
│                │                                                        │
│                │  ┌─────────────┬──────────────────────────────────┐   │
│                │  │ HISTORY     │  MESSAGE AREA                    │   │
│                │  │ PANEL       │                                  │   │
│                │  │ 280px       │  ┌────────────────────────────┐ │   │
│                │  │             │  │                            │ │   │
│                │  │ [« toggle]  │  │  [Assistant message]       │ │   │
│                │  │ [+ New]     │  │  [User message      ]     │ │   │
│                │  │             │  │  [Tool call pill     ]     │ │   │
│                │  │ Today       │  │  [Assistant message]       │ │   │
│                │  │  Conv title │  │  ...                       │ │   │
│                │  │  Conv title │  │                            │ │   │
│                │  │ Yesterday   │  │                            │ │   │
│                │  │  Conv title │  │  ┌──────────────────────┐ │ │   │
│                │  │  ...        │  │  │ INPUT AREA           │ │ │   │
│                │  │             │  │  │ [📎] [text...   ] [→]│ │ │   │
│                │  │             │  │  └──────────────────────┘ │ │   │
│                │  └─────────────┴──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key layout decisions

**No PageHeader / PageChrome.** The chat page is a full-bleed layout — no page title bar, no ContentPane wrapper. The conversation itself IS the content. This matches Claude.ai / ChatGPT convention and maximises vertical space for messages. The `ContentPane` component supports `padding={false}` for exactly this case.

**History panel is part of the page, not the sidebar.** The nav sidebar stays at 220px (unchanged). The history panel is a separate 280px column within the chat page area. This keeps the chat self-contained and doesn't interfere with the global nav.

---

## History panel (left column, full page only)

### Header
```
┌─────────────────────┐
│ [« ]    [+ New chat] │
└─────────────────────┘
```
- **Collapse toggle** (`«` / `»`): shrinks panel to 0, giving full width to messages. State persisted in localStorage.
- **New chat button**: primary style, creates a new conversation and focuses the input.

### Conversation list

Grouped by relative time: **Today**, **Yesterday**, **Previous 7 days**, **This month**, **Older**.

Each item:
```
┌─────────────────────────┐
│ Conversation title       │  ← text-sm font-medium, truncate 1 line
│ First message preview... │  ← text-xs text-muted-foreground, truncate 1 line
│                    2h ago│  ← text-xs text-muted-foreground, right-aligned
└─────────────────────────┘
```

- **Active conversation**: `bg-muted` background, `text-foreground` title (not sage — sage is for nav items)
- **Hover**: `bg-muted/50`, archive icon (trash) appears right-aligned on hover
- **Click**: loads conversation in message area
- **Group labels**: `text-xs font-medium uppercase tracking-wide text-muted-foreground` — matches design system "Label / meta" role

### Collapsed state
When collapsed, only the `»` expand button and `+` new chat button are visible, stacked vertically in a ~48px strip.

---

## Message area (main column)

### Layout
- **Max width**: `max-w-3xl` (~768px) centred in the available space with `mx-auto`
- **Padding**: `px-6 py-4` within the message scroll area
- **Scroll**: messages scroll within this area; input area is pinned to the bottom outside the scroll container
- **Auto-scroll**: scroll to bottom on new messages. If user has scrolled up, show a "↓ New messages" pill to jump back down.

### Message rendering

**User messages:**
```
                              ┌─────────────────────────┐
                              │ Message text here. Can   │
                              │ be multi-line.           │
                              └─────────────────────────┘
                              [image thumbnail if attached]
```
- Right-aligned
- Background: `bg-muted` (sage-light)
- Text: `text-sm text-foreground`
- Border radius: `rounded-2xl` (large, chat-bubble feel)
- Padding: `px-4 py-3`
- Max width: ~80% of message area width
- Images: rendered below text as thumbnails (~200px max width), click to expand

**Assistant messages:**
```
┌──────────────────────────────────────────┐
│ Full markdown-rendered response.         │
│                                          │
│ - Lists work                             │
│ - **Bold** and *italic* too              │
│                                          │
│ > Blockquotes for source attribution     │
│                                          │
│ ```code blocks```                        │
└──────────────────────────────────────────┘
```
- Left-aligned, no background (sits on page background)
- Text: `text-sm text-foreground`
- No bubble — flat, document-style (matching Claude.ai)
- Full markdown rendering: headings, lists, bold/italic, code blocks, links, tables, blockquotes
- Max width: ~100% of message area (the `max-w-3xl` container handles readability)
- Line height: generous (`leading-relaxed` / 1.625)

**Spacing between messages:** `gap-6` between consecutive messages. Same-role consecutive messages (rare for assistant, possible for user if they send multiple) get `gap-3`.

### Tool call indicators

Rendered inline, above the assistant's text response:

```
┌────────────────────────────────────────┐
│ 🔍 Searched knowledge for "reshoring"  │  ← collapsed (default)
│ 📋 Loaded brand DNA: value proposition │
└────────────────────────────────────────┘

Full assistant response text follows here...
```

- Each tool call is a small pill/row: icon + short description
- **Collapsed by default**: shows tool name + key parameter (e.g. "Searched knowledge for 'reshoring'")
- **Expandable**: click to reveal a summary of what was found (truncated result, not raw JSON)
- Styling: `text-xs text-muted-foreground`, subtle `bg-muted/50` background, `rounded-md`, `px-2 py-1`
- Icons per tool:
  - `search_knowledge` → `Search` (magnifying glass)
  - `get_brand_dna` → `Dna`
  - `get_source_knowledge` → `FileText`
  - `explore_graph` → `Network`
- Multiple tool calls stack vertically with `gap-1`

### Streaming state

While the assistant is generating:
- Tool calls appear as they happen (each pill animates in)
- Text streams character-by-character below the tool calls
- A subtle pulsing cursor (`▊`) at the end of the streaming text
- **Stop button**: appears below the streaming message — "Stop generating" as a small text button. Stops the stream and saves partial content.

---

## Input area

Pinned to the bottom of the chat page, outside the scroll container.

```
┌──────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────┐  │
│  │ [📎]  Ask BigBrain anything...              [→]    │  │
│  │                                                     │  │
│  │ [image preview thumbnail ×]                        │  │
│  └────────────────────────────────────────────────────┘  │
│  BigBrain can make mistakes. Verify important info.      │
└──────────────────────────────────────────────────────────┘
```

### Specifications
- **Container**: centred, `max-w-3xl mx-auto`, matching message area width
- **Input border**: `border border-border rounded-xl` — generous radius for a modern feel
- **Background**: `bg-card` (white)
- **Shadow**: `shadow-[var(--shadow-pane)]` — subtle lift
- **Textarea**: auto-growing, min 1 line (~44px), max 4 visible lines, then internal scroll. `text-sm`, no visible border (border is on the outer container)
- **Attach button** (`📎` / `Paperclip` icon): left side, `text-muted-foreground hover:text-foreground`. Opens file picker for `image/*`
- **Send button** (`→` / `ArrowUp` icon): right side, circular, `bg-primary text-primary-foreground` when input has content, `bg-muted text-muted-foreground` when empty (disabled)
- **Image preview**: when an image is attached, shows as a small thumbnail (48px) with an `×` remove button, below the text input inside the container
- **Keyboard**: Enter to send, Shift+Enter for newline
- **Disabled state**: while assistant is streaming, input is disabled (greyed, not focusable). Send button replaced by stop button in the message area.
- **Disclaimer**: small `text-[11px] text-muted-foreground` line below the input container — "BigBrain can make mistakes. Verify important info."

---

## Slide-out drawer

### Trigger
- **Location**: Top toolbar (next to the ideas lightbulb button)
- **Icon**: `MessageSquare` — same style as the lightbulb: `variant="ghost" size="icon"`, `h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10`
- **Behaviour**: toggles the drawer open/closed

### Drawer specs

```
┌───────────────────────────────┬──────────────────────┐
│  PAGE CONTENT (dimmed)        │  CHAT DRAWER          │
│                               │  440px                │
│                               │  ┌──────────────────┐│
│                               │  │ New chat │ Open ↗ ││
│                               │  │          │ [×]    ││
│                               │  ├──────────────────┤│
│                               │  │                  ││
│                               │  │  Messages...     ││
│                               │  │                  ││
│                               │  │                  ││
│                               │  ├──────────────────┤│
│                               │  │ [📎] [input] [→] ││
│                               │  └──────────────────┘│
└───────────────────────────────┴──────────────────────┘
```

- **Width**: 440px
- **Position**: fixed, right edge, full height (below the nav sidebar header height? No — the drawer overlays everything including the sidebar area vertically. It's a portal-rendered overlay.)
- **Backdrop**: `bg-foreground/10` — subtle dimming, page visible beneath. Click backdrop to close.
- **Animation**: slide in from right, `200ms ease-out`. Slide out `150ms ease-in`.
- **Z-index**: above page content, below modals (`z-40`)
- **Border**: `border-l border-border` on the left edge
- **Shadow**: `shadow-[var(--shadow-overlay)]` — heavier shadow for overlay feel

### Drawer header
```
[+ New chat]     [conversation title]     [Open ↗] [×]
```
- **New chat**: text button, left-aligned
- **Title**: centre, truncated, `text-sm font-medium`
- **Open in full view** (`↗` / `ExternalLink` icon): navigates to `/chat/[id]`, closes drawer
- **Close** (`×`): closes drawer

### Drawer message area
- Same rendering as full page but compact:
  - Body text: `text-[13px]` (vs `text-sm` / 14px on full page)
  - Message spacing: `gap-4` (vs `gap-6`)
  - No max-width constraint (fills the 440px minus padding)
  - Padding: `px-4` (vs `px-6`)
- Tool call indicators render the same but text is `text-[11px]`

### Drawer input area
- Same structure as full page, adapted:
  - No disclaimer text (space constrained)
  - Attach + textarea + send in the same layout
  - `rounded-lg` instead of `rounded-xl` (slightly tighter)

### Drawer state
- Opening the drawer resumes the most recent conversation (or starts a new one if none exist)
- Drawer state persists within a browser session — closing and reopening shows the same conversation
- If the user navigates to `/chat` while the drawer is open, the drawer closes and the conversation loads on the full page

### Conversation switching in drawer
- No history panel in the drawer (too narrow). Instead:
  - The drawer header title is a dropdown — click to see a compact list of recent conversations (last 10)
  - "View all conversations" link at the bottom of the dropdown navigates to `/chat` and closes the drawer

---

## Empty state

### Full page — no conversations

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│              [BigBrain icon, 48px, muted]               │
│                                                        │
│              What can I help you with?                  │
│                                                        │
│   ┌──────────────────────────────────────────────┐     │
│   │ [📎]  Ask BigBrain anything...        [→]    │     │
│   └──────────────────────────────────────────────┘     │
│                                                        │
│   Try:                                                 │
│   ┌─────────────────┐ ┌──────────────────────┐        │
│   │ "What do I know  │ │ "Help me think       │        │
│   │  about..."       │ │  through..."         │        │
│   └─────────────────┘ └──────────────────────┘        │
│   ┌─────────────────┐ ┌──────────────────────┐        │
│   │ "Write me a..."  │ │ "How does my         │        │
│   │                  │ │  strategy..."         │        │
│   └─────────────────┘ └──────────────────────┘        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

- Centred vertically and horizontally in the message area
- History panel still visible (collapsed or showing "No conversations" with new chat button)
- Prompt starter chips: `border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground hover:bg-muted cursor-pointer` — clicking one populates the input
- 2×2 grid of starters, `max-w-lg` centred

### Drawer — no conversations
Same concept but compact: BigBrain icon, "What can I help with?", input area, 2 prompt starters (single column).

---

## Loading states

- **Page load**: skeleton shimmer for history panel (5 rows of `h-12` bars) + centred spinner in message area
- **Conversation loading**: brief spinner in message area while messages fetch
- **Message streaming**: text streams in live (no skeleton — streaming IS the loading state)
- **Tool calls**: each pill appears with a subtle fade-in (`animate-in fade-in duration-200`)
- **Send**: user message appears immediately (optimistic), send button transitions to disabled state

## Error states

- **API error during streaming**: inline error message below the failed assistant message — "Something went wrong. Try again." with a retry button
- **Conversation load failure**: inline error in message area — "Couldn't load this conversation." with retry
- **Network offline**: toast notification — "You're offline. Messages will send when you reconnect." (stretch — v1 can just show the API error)

---

## Mobile considerations

Desktop-first. The `ScreenSizeGate` component (min 990px) already blocks small screens. At 990px:
- NavSidebar: 220px
- History panel: 280px (collapsible)
- Message area: 490px remaining — tight but workable with `max-w-3xl` relaxing to fill available space
- The drawer at 440px would consume nearly half the screen at 990px — acceptable for an overlay

No mobile-specific design in v1.

---

## New components needed

| Component | Category | Notes |
|---|---|---|
| `ChatMessage` | layout | Renders a single message (user or assistant). Handles markdown, images, tool calls. |
| `ChatInput` | form | Auto-growing textarea with attach + send. Manages image preview, keyboard shortcuts. |
| `ConversationList` | layout | History panel — grouped list, active state, archive on hover. |
| `ChatDrawer` | overlay | Slide-out drawer shell — backdrop, animation, header, close behaviour. |
| `ToolCallIndicator` | feedback | Collapsible pill showing tool name + parameter. Expandable for result summary. |
| `MarkdownRenderer` | layout | Wrapper around `react-markdown` + `remark-gfm` with design-system-consistent styling. |
| `PromptStarter` | layout | Clickable chip for empty-state prompt suggestions. |

All must be registered in `components/registry.ts` during build.

---

## Interaction with existing components

| Component | How it's used |
|---|---|
| `NavSidebar` | Nav config updated — "Content" → "Ask BigBrain", items changed |
| `TopToolbar` | New chat icon button added (drawer trigger) |
| `PageChrome` | NOT used — chat page is full-bleed |
| `ContentPane` | NOT used — chat has its own layout |
| `Modal` | Not needed in v1 (no confirmation dialogs for chat) |
| `EmptyState` | NOT used — chat has its own empty state design |

---

## Home page updates

The dashboard home page has a disabled "Chat" quick action card. Update it to:
- Link to `/chat`
- Remove the `QuickActionDisabled` wrapper
- Use the enabled `QuickAction` component with `href="/chat"`
