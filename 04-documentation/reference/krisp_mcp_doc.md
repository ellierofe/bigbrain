Krisp MCP: Supported tools
Who can use this feature?
Users: users on Core Plan

This page lists the tools that the Krisp MCP server exposes. Each tool is described briefly with example prompts. Document IDs are 32-character lowercase hex strings (UUID without dashes); use "get_document" with any such ID to retrieve full content.

date_time
Get current date/time or enumerate dates in a range. Use whenever you need exact date/time information instead of guessing.

Example prompts:
"What's the current date and time?"
"What dates fall in January 2024?"
"List weekdays for the next 7 days"
get_document
Fetch any document by its 32-character ID (meeting, agenda, transcript, etc.). Use after you have an ID from search results, action items, or upcoming meetings.

Example prompts:
"Fetch these 3 meeting documents: [id1, id2, id3]"
"Get full content for all meeting IDs from the last search"
list_action_items
List action items (tasks and follow-ups) from meetings. Can filter by completion status and assignee.

Example prompts:
"List my pending action items"
"Show completed tasks from meetings"
"What action items are assigned to me?"
"List up to 30 pending action items"
list_activities
List items from the Activity Center — notifications, action item assignments, meeting summaries, and other updates.

Example prompts:
"Show my recent Krisp notifications"
"List the latest activity items"
"What action items were assigned to me recently?"
list_upcoming_meetings
List upcoming calendar meetings for the next 1–14 days. Use "get_document" with an "get_document" from the results to get full agenda content.

Example prompts:
"What meetings do I have in the next 3 days?"
"List my upcoming meetings for the next week"
"Show meetings for the next 14 days"
search_meetings
Search meetings by text or retrieve by meeting ID(s). Returns metadata, summaries, key points, and action items. Use "get_document" when you need the full transcript.

Example prompts:
"Search for meetings about budget approval"
"Find meetings from last week with John"
"Get meeting abc123 by ID"
"Find all project pages mentioning "ready for dev""
"Meetings after 2024-01-15 about Q4 planning"


Krisp MCP
Who can use this feature?
Users: users on Core & Advanced Plans

Connect your AI tools to your Krisp workspace using the Model Context Protocol (MCP), an open standard that lets AI assistants interact with your meeting data, action items, and calendar.
 

Overview
Krisp MCP is a hosted server that gives AI tools secure access to your Krisp workspace. It is designed to work with AI assistants like Claude Code, Cursor, VS Code, ChatGPT, and others.

Krisp MCP supports Streamable HTTP transport only. Server-Sent Events (SSE) is not supported.
 

Why use Krisp MCP?
Easy setup: Connect through OAuth 2.0 with PKCE; complete the flow when your tool prompts you
Meeting intelligence: AI tools can search meetings, read transcripts and summaries, and list action items
Optimized for AI: Tools return structured data and natural-language summaries for agent use
What can you do with Krisp MCP?
Search meetings: Find past meetings by topic, content, attendees, or date range
Read meeting content: Fetch full transcripts, summaries, key points, and action items by document ID
Manage tasks: List action items, filter by assignee or completion status
Plan ahead: List upcoming calendar meetings and agenda IDs for the next 1–14 days
Stay updated: List Activity Center notifications (assignments, summaries, etc.)
Date/time: Get current date/time or enumerate dates in a range for accurate scheduling
Connecting to Krisp MCP
This guide walks you through connecting your AI tool to Krisp MCP. Once connected, your tool can read meeting data from your Krisp workspace based on your access and permissions.
 

Transport and URL
Transport	URL	Notes
Streamable HTTP	"https://mcp.krisp.ai/mcp"	Supported: use this URL only
SSE	Not supported	Use Streamable HTTP only
 

Cursor
Open Cursor Settings → MCP → Add new global MCP server
Paste the following configuration (JSON):

{
     "mcpServers": {
       "krisp": {
         "url": "https://mcp.krisp.ai/mcp"
       }
     }
   }
Save and restart Cursor. When you use a Krisp tool for the first time, complete the OAuth flow to connect your workspace
Project-level configuration
To share the Krisp MCP configuration with your team, create a ".cursor/mcp.json" file in your project root:

{
  "mcpServers": {
    "krisp": {
      "url": "https://mcp.krisp.ai/mcp"
    }
  }
}
Claude Code
Run the following in your terminal:

claude mcp add --transport http krisp https://mcp.krisp.ai/mcp
Then authenticate by running "/mcp" in Claude Code and following the OAuth flow.

Other tools
If your AI tool supports MCP with a remote HTTP server, use:

{
  "mcpServers": {
    "krisp": {
      "url": "https://mcp.krisp.ai/mcp"
    }
  }
}
If your tool does not support remote HTTP connections directly, use the mcp-remote bridge:

{
  "mcpServers": {
    "krisp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.krisp.ai/mcp"]
    }
  }
}
Security best practices
Use the official endpoint only: Connect only to https://mcp.krisp.ai/mcp. Do not use other URLs for Krisp MCP
Review actions: Enable human confirmation when possible so you can review what the agent does with your data
Protect your data: Untrusted tools or agents could be instructed to exfiltrate data. Use only trusted MCP clients and review permissions
Secure token storage: Store access and refresh tokens securely (e.g. encrypted); never expose them in client-side or public storage
HTTPS only: Use HTTPS for all OAuth redirect URIs and MCP connections in production
Troubleshooting
My tool doesn't support remote MCP servers: Use the mcp-remote configuration above.
Authentication issues: Complete the OAuth flow when prompted; disconnect and reconnect if access is lost; ensure you have the right permissions in your Krisp workspace.
Bearer token is missing: Requests must include `Authorization: Bearer <access_token>`. Complete the OAuth flow and ensure your client sends the token on each request.
Document not found: Document IDs must be exactly 32 lowercase hexadecimal characters (no dashes). Strip dashes from UUIDs before calling "get_document" or "get_multiple_documents".
