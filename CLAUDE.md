# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ambience AI MCP Server — a TypeScript MCP (Model Context Protocol) server that acts as a secure proxy between MCP clients (e.g., Claude Code) and the Ambience AI backend. It forwards authenticated requests for generating images, videos, speech, and music. No API keys are stored; authentication tokens are forwarded from the client to the backend.

## Commands

```bash
npm run build          # Compile TypeScript (tsc) → dist/
npm run dev            # Dev mode with hot-reload (tsx watch)
npm run typecheck      # Type-check without emitting (tsc --noEmit)
npm test               # Run all tests (Jest with ESM support)
npm test -- --testPathPattern="auth"   # Run a single test file by name
npm run test:coverage  # Tests with coverage report
```

Tests require the `--experimental-vm-modules` Node flag (already configured in the test script).

## Architecture

The server uses **stdio transport** (`StdioServerTransport` from `@modelcontextprotocol/sdk`) — it communicates via stdin/stdout, not HTTP.

### Source files (`src/`)

- **index.ts** — Entry point. Creates the MCP `Server`, registers `ListToolsRequest` and `CallToolRequest` handlers, extracts auth tokens, and starts the stdio transport. Dotenv output is suppressed to avoid corrupting the MCP stdio stream.
- **tools.ts** — `AmbienceAITools` class. Defines all MCP tool schemas (input schemas for each tool) via `getTools()` and routes tool calls via `executeTool()`. Also handles fetching completed media as base64 for inline MCP responses. Contains `determineMediaType()` for mapping URLs/types to MCP-compatible content types (image/audio; video is skipped since MCP SDK doesn't support it).
- **api-client.ts** — `AmbienceAPIClient` class. Axios-based HTTP client that makes requests to the Ambience AI backend (`AMBIENCE_API_URL`). Each generation type maps to a specific backend endpoint (`/api/generate/image`, `/api/generate/video`, `/api/generate/audio`). The `generateImageMulti` method currently maps multiple image URLs to `imageUrl` + `guideImageUrl` fields on the single-image endpoint.
- **auth.ts** — Token extraction from MCP request context. Checks `extra.auth.accessToken`, then `extra.headers.authorization`, then falls back to `AMBIENCE_ACCESS_TOKEN` env var.
- **types.ts** — Zod schemas and TypeScript types for all API requests/responses. All generation request schemas use Zod validation with defaults.
- **constants.ts** — Generation type constants, estimated durations, and display strings. `getCompletionTimeInfo()` provides polling guidance with buffer time. These values should stay in sync with the main Ambience AI app.

### Key patterns

- All tool handler methods follow the same pattern: parse args with Zod schema → call API client → return MCP text content with creation ID and polling guidance.
- `generate_audio` is a legacy tool kept for backward compatibility; prefer `generate_music` and `generate_speech`.
- Backend API responses for library are wrapped in `{ creations: [], total: number }` — the client unwraps this.
- `console.error` is used for server logging (stdout is reserved for MCP protocol).

## Environment Variables

- `AMBIENCE_API_URL` — Backend URL (default: `http://localhost:3000`)
- `AMBIENCE_ACCESS_TOKEN` — Fallback auth token for dev/testing
- `PORT` — Server port (default: `3001`, used when not in stdio mode)

## Testing

Tests live in `src/__tests__/unit/`. Jest is configured with `ts-jest` ESM preset. Test files match `**/__tests__/**/*.test.ts`. Coverage thresholds are set at 10% minimum (branches, functions, lines, statements).

## CI

GitHub Actions (`.github/workflows/test.yml`) runs typecheck and tests with coverage on push to main and on PRs. Uses Node 22.
