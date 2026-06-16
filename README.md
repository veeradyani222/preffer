# preffer.me
Making everyone prefer you.

Preffer is a hackathon project (2fast2mcp) that gives anyone a professional page plus an AI representative that talks to visitors, answers questions, captures intent, and turns conversations into business outcomes. Instead of building only for founders or SaaS builders, preffer is built for everyone who wants to be more productive and grow their business with AI.

Live: https://preffer.me

## Why This Exists
Most AI tools today are optimized for developers and founders. preffer is for anyone: creators, freelancers, local businesses, students, and non-technical builders who still deserve leverage. The idea is simple: let people build a clean public page, then put a smart AI representative on it that handles the repetitive conversations and captures value automatically.

## What It Does
- Portfolio creation wizard with conversational AI and approval flow
- Public portfolio pages with flexible sections and multiple themes
- AI representative that chats with visitors on each portfolio
- AI capabilities that detect intent and capture structured data:
  - Lead capture
  - Appointment requests
  - Order/quote requests
  - Support escalation
  - FAQ unknown escalation
  - Follow-up requests
  - Feedback and reviews
- Owner workspace: chat to update portfolio content or AI manager behavior
- Analytics for views, sessions, messages, and AI insights
- MCP server for Archestra and other MCP clients to manage portfolios

## How It Works 
- Frontend: Next.js app for landing, dashboard, wizard, analytics, and public pages.
- Backend: Express API + PostgreSQL for auth, portfolios, AI chat, analytics.
- AI: Google Gemini with model fallback and optional Archestra LLM proxy.
- Archestra: agent creation/sync, A2A chat routing, MCP tooling, and optional outgoing emails.

## Archestra Integration 
preffer uses Archestra in three distinct ways:

1. LLM Proxy 
   - In development, Gemini calls are routed through Archestra’s LLM proxy for monitoring, safety, and cost tracking.
   - Configured via `ARCHESTRA_LLM_PROXY_URL` and `ARCHESTRA_PROFILE_ID`.
   - In production, calls go directly to Gemini.

2. Agent Management + A2A Chat
   - Each portfolio’s AI manager maps to an Archestra agent.
   - On publish, agents are created or synced.
   - Visitor chat is routed through Archestra A2A when an agent is linked, with a fallback to direct Gemini if not.

3. MCP Server 
   - The backend exposes `/mcp` using MCP’s streamable HTTP transport.
   - MCP endpoint: `https://app.preffer.me/mcp` (hosted) or `http://localhost:5000/mcp` (local).
   - Auth is `Bearer <user_api_key>`. The API key is available in the Credentials page (`/user/credentials`).
   - This lets Archestra or any MCP client manage portfolios and AI capabilities as tools.

MCP Tools (Exposed)
- `get_portfolios` — list all portfolios for the authenticated user.
- `get_portfolio` — get full details for a portfolio by ID.
- `get_portfolio_by_slug` — get a published portfolio by slug.
- `create_portfolio` — create a new draft portfolio.
- `update_portfolio_info` — update core portfolio fields (name, profession, description, etc.).
- `delete_portfolio` — delete a portfolio.
- `add_section` — add a section to a portfolio.
- `update_section` — update an existing section.
- `remove_section` — remove a section.
- `get_section_schemas` — retrieve section schemas + guidance.
- `recommend_sections` — AI-recommend sections based on the description.
- `publish_portfolio` — publish a portfolio with a slug.
- `check_slug` — check if a slug is available.
- `get_ai_manager` — get AI manager configuration.
- `update_ai_manager` — update AI manager name/personality/instructions.
- `get_ai_capabilities` — list AI capability configuration for a portfolio.
- `update_ai_capabilities` — update AI capability configuration.
- `get_credits` — get plan + remaining credits.
- `get_themes` — list available themes and color schemes.
- `update_theme` — update theme and color scheme.
- `get_analytics_overview` — overall analytics summary.
- `get_portfolio_analytics` — analytics for a specific portfolio.
- `get_top_portfolios` — top portfolios by views/engagement.
- `get_visitor_conversations` — recent AI manager conversations.
- `get_analytics_insights` — AI-driven analytics insights.
- `get_traffic_trends` — traffic trends over time.
- `compare_portfolios` — compare portfolio performance metrics.

Optional: Outgoing Email
- A follow-up email can be sent via Archestra’s outgoing email endpoint after a lead is captured.
- Implemented in `backend/src/services/archestra-outgoing-email.service.ts`.
- Currently wired for local dev (`http://localhost:9000`) and can be toggled with `ARCHESTRA_ENABLE_OUTGOING_EMAIL=false`.

## Core User Flow
1. Sign in with Google.
2. Start the 7-step wizard to create a portfolio.
3. Use AI chat to generate or refine each section (approve to save).
4. Publish with a slug and optionally enable the AI manager.
5. Visitors talk to the AI rep, and the system captures intents.
6. Owners view analytics, AI records, and adjust AI behavior.

## Tech Stack
- Frontend: Next.js 16 (App Router), React 19, Tailwind
- Backend: Node.js, Express, PostgreSQL, Passport (Google OAuth)
- AI: Google Gemini with fallback and optional Archestra proxy
- MCP: `@modelcontextprotocol/sdk`

## Repo Structure
- `frontend/` Next.js app
  - `src/app/` pages (landing, dashboard, wizard, public pages, AI chat)
  - `src/components/` sections and themes
- `backend/` Express API
  - `src/controllers/` API controllers
  - `src/services/` AI, portfolio, analytics, Archestra integrations
  - `src/mcp/` MCP server + transport
  - `migrations/` and `schema.sql` for PostgreSQL

## Local Development
1. Install dependencies
   - `cd backend && pnpm install`
   - `cd ../frontend && pnpm install`
2. Configure environment
   - Copy `backend/.env` and replace secrets with your own values.
   - Set `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to match your ports.
3. Set up the database
   - `cd backend && pnpm db:setup`
4. Run the apps
   - Backend: `cd backend && pnpm dev`
   - Frontend: `cd frontend && pnpm dev`

Default ports:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:4000`

## Environment Variables (Backend)
Backend:
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `ARCHESTRA_LLM_PROXY_URL`
- `ARCHESTRA_PROFILE_ID`
- `ARCHESTRA_API_KEY`
- `ARCHESTRA_A2A_TOKEN`
- `ARCHESTRA_TEAM_ID`
- `ARCHESTRA_ORG_ID`
- `ARCHESTRA_LLM_API_KEY_ID`
- `ARCHESTRA_ENABLE_OUTGOING_EMAIL`

Frontend:
- `NEXT_PUBLIC_API_URL`

## API Surface 
- Auth: `/api/auth/*`
- Wizard: `/api/wizard/*`
- Portfolio: `/api/portfolio/*`
- Assistant (owner workspace): `/api/assistant/*`
- Analytics: `/api/analytics/*`
- MCP: `/mcp` (stateless, Bearer API key)

## Notes
- Outgoing email via Archestra is implemented but set for local-only by default. Adjust the base URL in `backend/src/services/archestra-outgoing-email.service.ts` if you want a hosted Archestra instance.
