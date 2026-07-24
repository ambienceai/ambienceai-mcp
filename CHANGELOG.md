# Changelog

All notable changes to the Ambience AI MCP Server are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `generate_chart` tool: create bar, line, pie, or KPI counter charts from
  structured data, as a static image or an animated video. Costs are sourced
  from the `/api/models` `generators` field, so no release is needed when they
  change.

## [1.1.1] - 2026-07-19

### Added

- Server-driven model info: tool descriptions, credit costs, and default models
  are read live from `/api/models`, so backend changes no longer require a
  server release.

### Changed

- Authentication and access errors now explain how to resolve them (create a
  token, or sign up for a paid plan) and name the plans explicitly.

### Fixed

- Silent startup failure when launched via `npx` or an installed binary.

## [1.0.0] - 2026-07-04

First public release.

### Added

- MCP tools: `generate_image`, `generate_image_multi`, `generate_video`,
  `generate_music`, `generate_speech`, `generate_audio` (legacy),
  `transcribe_audio`, `upscale_image`, `get_credits`, `get_library`, and
  `get_creation_status`.
- Dynamic model info in tool descriptions, sourced from the Ambience AI
  `/api/models` endpoint (including polling durations).
- Secure token-forwarding architecture: authenticates with an Ambience AI
  API token via `AMBIENCE_ACCESS_TOKEN`; no credentials are stored in the
  server.
- Jest test suite and GitHub Actions CI (type check + coverage).
- `LICENSE` (MIT), `CHANGELOG.md`, and npm publish metadata.

### Changed

- The default `AMBIENCE_API_URL` is now the production Ambience AI API
  (`https://www.ambienceai.com`), so `npx @ambienceai/mcp-server` works out
  of the box. Set `AMBIENCE_API_URL` explicitly for local development.
- Model parameters accept flexible strings instead of hardcoded enums, so
  new models work without a server update.

### Fixed

- Cinematic video generation routing.
- GPT Image polling duration synced to the backend (2 minutes).
- Music generation no longer sends an unsupported duration parameter.

[1.0.0]: https://github.com/ambienceai/ambienceai-mcp/releases/tag/v1.0.0
