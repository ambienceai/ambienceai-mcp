# Ambience AI MCP Server

A secure [Model Context Protocol](https://modelcontextprotocol.io/) proxy server that connects to the Ambience AI platform for creating images, videos, and audio. No API keys required - uses your existing Ambience AI account authentication.

## Features

- 🖼️ **Image Generation** - Create images from text prompts using advanced AI models
- 🎥 **Video Generation** - Generate videos with customizable duration and aspect ratios
- 🎵 **Audio Generation** - Create speech and music from text descriptions
- 💳 **Credits Management** - Check your credit balance and usage
- 📚 **Library Management** - Browse and manage your generated content
- 🔒 **Secure Token Forwarding** - Uses your Ambience AI web app authentication tokens

## Available Tools

### `get_credits`
Check your current credit balance for AI generations.

### `generate_image`
Generate an image from a text prompt.
- **prompt** (required): Description of the image to generate
- **aspectRatio** (optional): `16:9`, `9:16`, `1:1`, `4:3`, or `3:4` (default: `16:9`)
- **model** (optional): `flux` or `gpt_image` (default: `flux`)
- **seed** (optional): Random seed for reproducible results

### `generate_video`
Generate a video from a text prompt.
- **prompt** (required): Description of the video to generate
- **aspectRatio** (optional): `16:9`, `9:16`, or `1:1` (default: `16:9`)
- **duration** (optional): Duration in seconds, 1-30 (default: `30`)
- **model** (optional): `standard` or `premium` (default: `standard`)

### `generate_audio`
Generate speech or music from a text prompt.
- **prompt** (required): Text or description for audio generation
- **type** (required): `speech` or `music`
- **voice** (optional): Voice for speech generation (default: `af_heart`)
- **language** (optional): Language for speech (default: `american-english`)
- **duration** (optional): Duration for music generation in seconds

### `get_library`
Get a list of your generated creations.
- **limit** (optional): Number of items to return, 1-100 (default: `10`)
- **offset** (optional): Number of items to skip for pagination (default: `0`)

### `get_creation_status`
Check the status of a specific creation.
- **creationId** (required): The unique ID of the creation

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ambienceai-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables:
```bash
# Required - Your Ambience AI Backend URL
AMBIENCE_API_URL=http://localhost:3000

# Optional - MCP Server Port
PORT=3001
```

## Authentication Setup

1. **No API Keys Required** - This MCP server acts as a secure proxy
2. **Use Existing Account** - Authenticate through your Ambience AI web application
3. **Token Forwarding** - Your authentication tokens are securely forwarded to the backend
4. **Zero Configuration** - No sensitive credentials stored in the MCP server

## Development

Build the project:
```bash
npm run build
```

Run in development mode:
```bash
npm run dev
```

**Note**: The server requires a valid authentication token from your Ambience AI account. Tokens are obtained through the web application's OAuth flow and forwarded securely to the backend.

## Testing the MCP Server

You can test the MCP server directly without Claude Code using several methods:

### Option 1: MCP Inspector (Visual Interface)

The MCP Inspector provides a browser-based visual interface for testing MCP servers:

```bash
# Set your API token
export AMBIENCE_ACCESS_TOKEN="your-api-token-here"

# Start the visual inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a browser interface where you can:
- See all available tools
- Test each tool with custom parameters
- View responses and debug issues
- Inspect tool schemas and capabilities

### Option 2: MCP Inspector CLI Mode

For command-line testing and scripting:

```bash
# Set your API token
export AMBIENCE_ACCESS_TOKEN="your-api-token-here"

# Start CLI mode
npx @modelcontextprotocol/inspector --cli node dist/index.js
```

This provides a command-line interface for:
- Programmatic testing
- Integration with scripts
- Automated testing workflows

### Option 3: Quick Test Script

Use the included test script for automated testing:

```bash
# Set your API token
export AMBIENCE_ACCESS_TOKEN="your-api-token-here"

# Run the test script
npm test
# or directly:
node test-server.js
```

This script automatically tests:
- Tool listing
- Credit balance checking
- Image generation
- Library access

### Option 4: Manual Testing Commands

Test individual tools using the CLI:

```bash
# Test getting credits
echo '{"method":"tools/call","params":{"name":"get_credits","arguments":{}}}' | npx @modelcontextprotocol/inspector --cli node dist/index.js

# Test image generation
echo '{"method":"tools/call","params":{"name":"generate_image","arguments":{"prompt":"A sunset over mountains","aspectRatio":"16:9"}}}' | npx @modelcontextprotocol/inspector --cli node dist/index.js

# Test listing library
echo '{"method":"tools/call","params":{"name":"get_library","arguments":{"limit":5}}}' | npx @modelcontextprotocol/inspector --cli node dist/index.js
```

### Expected Responses

**Successful `get_credits` response:**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "Current credit balance: 150 credits"
    }
  ]
}
```

**Successful `generate_image` response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Image generated successfully! Creation ID: creation_123"
    }
  ]
}
```

### Troubleshooting Testing

- **Authentication errors**: Ensure `AMBIENCE_ACCESS_TOKEN` is set and valid
- **Connection errors**: Verify your Ambience AI backend is running on `http://localhost:3000`
- **Tool not found**: Make sure the server is built (`npm run build`) and using the latest code
- **Timeout errors**: Some operations (video/image generation) may take time to complete

## Usage with Claude Code

### 1. Build the MCP Server

```bash
npm run build
```

### 2. Configure Claude Code

Add the following configuration to your Claude Code settings JSON:

```json
{
  "mcpServers": {
    "ambienceai": {
      "command": "node",
      "args": ["/path/to/ambienceai-mcp/dist/index.js"],
      "env": {
        "AMBIENCE_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

**Replace `/path/to/ambienceai-mcp/` with the actual path to your MCP server directory.**

### 3. Authentication Setup

You have two options for providing your API token:

#### Option A: Environment Variable (Recommended for Development)
```bash
export AMBIENCE_ACCESS_TOKEN="your-api-token-here"
```

#### Option B: MCP Configuration (if supported by Claude Code)
```json
{
  "mcpServers": {
    "ambienceai": {
      "command": "node",
      "args": ["/path/to/ambienceai-mcp/dist/index.js"],
      "env": {
        "AMBIENCE_API_URL": "http://localhost:3000"
      },
      "auth": {
        "accessToken": "your-api-token-here"
      }
    }
  }
}
```

### 4. Get Your API Token

1. Visit your Ambience AI settings page at `http://localhost:3000/settings`
2. Navigate to the "API Access Tokens" section
3. Click "Generate API Token" to create a new token
4. Copy the generated token for use in the configuration above

### 5. Available Tools

Once configured, you'll have access to these tools in Claude Code:

- **`get_credits`** - Check your current credit balance
- **`generate_image`** - Create images from text prompts
- **`generate_video`** - Generate videos from descriptions  
- **`generate_audio`** - Create speech or music from text
- **`get_library`** - Browse your generated creations
- **`get_creation_status`** - Check the status of ongoing generations

### Troubleshooting

#### "Unexpected token 'd', '[dotenv@17.'" Error
This error occurs with older versions of the MCP server. Make sure you're using the latest version with suppressed dotenv output. If you see this error:

1. Ensure you've run `npm run build` after updating
2. Verify the path in your configuration points to `dist/index.js`
3. Check that your Ambience AI backend is running on the configured URL

#### Authentication Errors
- Verify your API token is valid and not expired
- Ensure your Ambience AI backend server is running
- Check that `AMBIENCE_API_URL` points to the correct backend URL

## Authentication

This MCP server uses a secure proxy architecture for authentication:

- **Token Forwarding**: Accepts tokens from your Ambience AI web app and forwards them to the backend
- **No Secrets**: Zero API keys or sensitive credentials stored in the MCP server
- **Backend Validation**: All authentication and authorization handled by your secure web server
- **Open Source Safe**: Can be safely distributed without exposing credentials
- **Stateless Proxy**: No user data or session state stored locally

## API Integration

The server acts as a secure proxy to your Ambience AI web server for:
- Token validation and user authorization
- Credit management and billing
- AI model orchestration
- Asset storage and delivery  
- Generation status tracking

## Error Handling

All tools provide comprehensive error messages and status information:
- Authentication errors from your web server are forwarded clearly
- API errors include helpful debugging information from the backend
- Generation status can be tracked for long-running operations
- Credit insufficient warnings are provided by your billing system

## License

MIT License - see LICENSE file for details.