# Ambience AI MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server that connects Claude to [Ambience AI](https://www.ambienceai.com) for creating images, videos, music, and speech. Ask Claude for a cozy cabin scene or a custom soundtrack, and the creation lands in your Ambience AI library.

No API keys are stored in this server. It forwards your Ambience AI account token to the backend, which handles all authentication and billing.

## Quick Start

**What you need:**

- An Ambience AI account on any [paid plan](https://www.ambienceai.com/pricing) (MCP access is included with Premium, Team, and Business)
- Node.js 18 or newer
- Claude Desktop or Claude Code

New to Ambience AI? [Create an account](https://www.ambienceai.com/pricing) and pick any paid plan, then come back here. Plans start at $15/month and include monthly credits for images, videos, music, and speech.

**1. Create your API token**

Sign in to Ambience AI, open Settings, find the API Tokens card, and select Create API Token. Copy the token right away; it is shown only once.

**2. Add the server to Claude**

For Claude Code, run this in your terminal:

```bash
claude mcp add ambience --env AMBIENCE_ACCESS_TOKEN=YOUR_TOKEN -- npx -y @ambienceai/mcp-server
```

For Claude Desktop, add this to `claude_desktop_config.json` and restart the app:

```json
{
  "mcpServers": {
    "ambience": {
      "command": "npx",
      "args": ["-y", "@ambienceai/mcp-server"],
      "env": {
        "AMBIENCE_ACCESS_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

Config file locations:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**3. Create something**

Ask Claude: _"Create an image of a cozy cabin in a snowstorm, warm light glowing from the windows."_

For a full walkthrough with screenshots, see the [setup guide](https://www.ambienceai.com/guides/connect-claude-mcp).

## Available Tools

| Tool                   | What it does                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `generate_image`       | Create an image from a text prompt                                                          |
| `generate_image_multi` | Create an image from multiple input images for editing, composition, or style mixing        |
| `generate_video`       | Create a video from a text prompt                                                           |
| `generate_music`       | Create instrumental tracks, songs with lyrics, or ambient soundscapes                       |
| `generate_speech`      | Convert written text into natural-sounding speech                                           |
| `generate_audio`       | Legacy speech and music tool (use `generate_music` or `generate_speech` for better control) |
| `transcribe_audio`     | Convert speech to text, subtitles, or captions                                              |
| `upscale_image`        | Increase image resolution up to 4x while preserving quality                                 |
| `get_credits`          | Check your current credit balance                                                           |
| `get_library`          | Browse your generated creations                                                             |
| `get_creation_status`  | Check the status of a specific creation                                                     |

Available models, credit costs, and default models are fetched live from the Ambience AI API, so tool descriptions stay current without a server update. Omitting the model parameter uses the server's current recommended default.

## Configuration

| Environment variable    | Required | Default                      | Purpose                                                                                 |
| ----------------------- | -------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| `AMBIENCE_ACCESS_TOKEN` | Yes      | none                         | Your Ambience AI API token                                                              |
| `AMBIENCE_API_URL`      | No       | `https://www.ambienceai.com` | Backend URL; set to `http://localhost:3000` for local development against a dev backend |

## Troubleshooting

- **`subscription_required` errors**: MCP access is included with every paid plan (Premium, Team, or Business). Check that your account or organization is on a paid plan, and that your token was created from that account.
- **Authentication errors**: tokens expire after 90 days, and deleted tokens stop working right away. Create a fresh token in your Ambience AI settings and update your Claude configuration.
- **Server doesn't appear in Claude**: restart Claude Desktop after editing the config file, and confirm Node.js 18 or newer is installed so `npx` can run.
- **Timeouts**: video and image generation can take a few minutes. Use `get_creation_status` to track long-running creations.

## Contributing

Bug reports and pull requests are welcome on [GitHub](https://github.com/ambienceai/ambienceai-mcp). For development setup, testing, and release guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License. See [LICENSE](./LICENSE) for details.
