# MCP HTTP Server

A Model Context Protocol (MCP) server implementation over HTTP with OAuth2/JWT authentication support.

## Features

- **MCP Protocol Support**: Implements the Model Context Protocol (MCP) specification (v2025-06-18)
- **OAuth2/JWT Authentication**: Secure authentication using AuthAction or any OAuth2 provider
- **HTTP Transport**: RESTful API endpoints for MCP communication
- **StreamableHTTP Transport**: Server-Sent Events support for MCP Inspector
- **Tool System**: Extensible tool framework with built-in tools
- **Root System**: File system root support for MCP Inspector
- **Health Monitoring**: Built-in health check and monitoring endpoints

## Built-in Tools

1. **echo**: Echo back input text
2. **time**: Get current server time
3. **calculate**: Perform basic mathematical calculations

## Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
APP_DOMAIN=http://localhost

# AuthAction Configuration (or your OAuth2 provider)
AUTHACTION_DOMAIN=tenant-name.tenant-region.authaction.com
AUTHACTION_AUDIENCE=your-authaction-api-identifier
```

4. Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

### Public Endpoints

- `GET /` - Server information and available endpoints
- `GET /health` - Health check endpoint
- `GET /.well-known/oauth-authorization-server` - OAuth2 authorization server metadata
- `GET /.well-known/oauth-protected-resource` - OAuth2 protected resource metadata

### Protected Endpoints

- `POST /mcp` - MCP protocol endpoint (requires JWT authentication)
- `POST /mcp/stream` - StreamableHTTP MCP endpoint (for MCP Inspector, requires JWT authentication)

## MCP Protocol

The server implements the following MCP methods:

### `initialize`

Initialize the MCP connection and negotiate protocol version.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "initialize",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": {},
      "sampling": {},
      "roots": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "mcp-server",
      "version": "1.0.0"
    }
  }
}
```

### `tools/list`

List available tools.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "tools": [
      {
        "name": "echo",
        "description": "Echo back the input text",
        "inputSchema": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string",
              "description": "Text to echo back"
            }
          },
          "required": ["text"]
        }
      }
    ]
  }
}
```

### `roots/list`

List available file system roots.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "roots/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "result": {
    "roots": [
      {
        "name": "default",
        "uri": "file:///",
        "description": "Default file system root"
      }
    ]
  }
}
```

### `tools/call`

Execute a tool.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {
      "text": "Hello, World!"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Echo: Hello, World!"
      }
    ]
  }
}
```

## Authentication

The main MCP endpoint (`/mcp`) requires JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Both MCP endpoints require JWT authentication for security and consistency.

### JWT Configuration

The server validates JWTs using the following configuration:

- **Issuer**: `https://{AUTHACTION_DOMAIN}/`
- **Audience**: `{AUTHACTION_AUDIENCE}`
- **Algorithm**: RS256
- **JWKS Endpoint**: `https://{AUTHACTION_DOMAIN}/.well-known/jwks.json`

## Project Structure

```
mcp-server/
├── src/
│   ├── server.js              # Main Express server setup
│   ├── mcp-handler.js         # MCP protocol handler
│   ├── streamable-http-handler.js # StreamableHTTP handler
│   └── tools.js               # Tool definitions and handlers
├── index.js                   # Entry point
├── test-client.js             # Test client
├── package.json               # Dependencies and scripts
└── README.md                  # Documentation
```

## Adding Custom Tools

To add custom tools, modify the `src/tools.js` file:

1. Add tool definition to the `tools` array:

```javascript
{
  name: "my-tool",
  description: "Description of my tool",
  inputSchema: {
    type: "object",
    properties: {
      // Define your tool's parameters
    },
    required: ["required-param"]
  }
}
```

2. Add tool handler to the `toolHandlers` object:

```javascript
my-tool: async (args) => {
  // Implement your tool logic
  return {
    content: [
      {
        type: "text",
        text: "Tool result"
      }
    ]
  };
}
```

## Testing

Run the test client to verify server functionality:

```bash
npm test
```

This will test all endpoints and verify authentication requirements.

## Environment Variables

| Variable              | Description            | Default            |
| --------------------- | ---------------------- | ------------------ |
| `PORT`                | Server port            | `3000`             |
| `APP_DOMAIN`          | Server domain          | `http://localhost` |
| `AUTHACTION_DOMAIN`   | OAuth2 provider domain | Required           |
| `AUTHACTION_AUDIENCE` | OAuth2 audience        | Required           |

## Error Handling

The server implements proper JSON-RPC 2.0 error handling with standard error codes:

- `-32700`: Parse error
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

## Security Considerations

1. **JWT Validation**: All MCP requests require valid JWT tokens
2. **Rate Limiting**: JWKS requests are rate-limited to prevent DoS attacks
3. **Input Validation**: All tool inputs are validated against schemas
4. **Error Handling**: Sensitive information is not exposed in error messages

## License

MIT License - see LICENSE file for details.
