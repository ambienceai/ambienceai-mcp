# Contributing to the Ambience AI MCP Server

Thanks for your interest in contributing! This guide covers developing the MCP server itself. For installing and using it with Claude, see the [README](./README.md).

## Development setup

```bash
git clone https://github.com/ambienceai/ambienceai-mcp.git
cd ambienceai-mcp
npm install
cp .env.example .env   # point AMBIENCE_API_URL at your local backend
npm run build          # compile TypeScript to dist/
npm run dev            # watch mode
npm test               # Jest test suite
npm run typecheck      # TypeScript check
```

If you set `AMBIENCE_API_URL` to a local backend, make sure it is running at that URL before testing against it.

## Testing the server directly

The MCP Inspector gives you a browser interface to list tools, call them with custom parameters, and inspect responses:

```bash
export AMBIENCE_ACCESS_TOKEN="your-api-token"
npx @modelcontextprotocol/inspector node dist/index.js
```

For command-line testing, add `--cli`:

```bash
echo '{"method":"tools/call","params":{"name":"get_credits","arguments":{}}}' | npx @modelcontextprotocol/inspector --cli node dist/index.js
```

There is also a quick automated check in `test-server.js` (`npm run test:server`) that lists tools, checks credits, and exercises image generation and library access.

## Pull requests

CI runs type checking and the test suite with coverage on every pull request. Before opening one, make sure `npm run typecheck` and `npm test` pass locally.

## Releasing (maintainers)

Releases publish to npm through [trusted publishing](https://docs.npmjs.com/trusted-publishers/) with staged approval — no npm tokens are stored anywhere:

1. Update `CHANGELOG.md`: rename the `[Unreleased]` heading to the new version with today's date, and start a fresh empty `[Unreleased]` section above it.
2. Bump the version: `npm version <patch|minor|major>`, then push the commit and tag.
3. Create a GitHub Release for the tag. CI stages the publish to npm.
4. Approve the staged version on npmjs.com (requires 2FA) to make it live.
