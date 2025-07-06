const { tools, toolHandlers } = require("./tools");

// MCP Protocol constants
const MCP_PROTOCOL_VERSION = "2025-06-18";

// JSON-RPC 2.0 response helper for StreamableHTTP
const createJsonRpcResponse = (id, result, error = null) => {
  const response = {
    jsonrpc: "2.0",
    // Preserve the original ID type (number or string)
    id: id !== undefined ? id : null,
  };

  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }

  return response;
};

// MCP method handlers for StreamableHTTP
const mcpHandlers = {
  initialize: (id) => {
    console.log("Handling StreamableHTTP initialize request");
    return createJsonRpcResponse(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
        sampling: {},
        roots: {
          listChanged: true,
        },
      },
      serverInfo: {
        name: "mcp-server",
        version: "1.0.0",
      },
    });
  },

  "tools/list": (id) => {
    console.log("Handling StreamableHTTP tools/list request");
    return createJsonRpcResponse(id, {
      tools: tools,
    });
  },

  "roots/list": (id) => {
    console.log("Handling StreamableHTTP roots/list request");
    return createJsonRpcResponse(id, {
      roots: [
        {
          name: "default",
          uri: "file:///",
          description: "Default file system root",
        },
      ],
    });
  },

  "tools/call": async (id, params) => {
    console.log("Handling StreamableHTTP tools/call request");
    const { name, arguments: args } = params;

    if (!name || !toolHandlers[name]) {
      return createJsonRpcResponse(id, null, {
        code: -32601,
        message: "Method not found",
        data: `Tool '${name}' not found`,
      });
    }

    try {
      const result = await toolHandlers[name](args || {});
      return createJsonRpcResponse(id, result);
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      return createJsonRpcResponse(id, null, {
        code: -32602,
        message: "Invalid params",
        data: error.message,
      });
    }
  },

  "notifications/notify": (id, params) => {
    console.log("Handling StreamableHTTP notification:", params);
    // MCP notifications don't require a response
    return null;
  },
};

// StreamableHTTP MCP request handler
const handleStreamableHttpRequest = async (req, res) => {
  console.log(
    "StreamableHTTP MCP request received:",
    JSON.stringify(req.body, null, 2)
  );

  // Set headers for StreamableHTTP
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // Send initial connection established message
  res.write(
    'data: {"jsonrpc":"2.0","method":"notifications/notify","params":{"method":"connection/established"}}\n\n'
  );

  // Validate basic JSON-RPC structure
  if (!req.body || typeof req.body !== "object") {
    const errorResponse = createJsonRpcResponse("1", null, {
      code: -32700,
      message: "Parse error",
      data: "Invalid JSON",
    });
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    return res.end();
  }

  const { method, params, id, jsonrpc } = req.body;

  // Validate JSON-RPC 2.0 format
  if (jsonrpc !== "2.0") {
    const errorResponse = createJsonRpcResponse(id, null, {
      code: -32600,
      message: "Invalid Request",
      data: "Missing or invalid jsonrpc field",
    });
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    return res.end();
  }

  if (!method || typeof method !== "string") {
    const errorResponse = createJsonRpcResponse(id, null, {
      code: -32600,
      message: "Invalid Request",
      data: "Missing or invalid method field",
    });
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    return res.end();
  }

  try {
    const handler = mcpHandlers[method];

    if (!handler) {
      const errorResponse = createJsonRpcResponse(id, null, {
        code: -32601,
        message: "Method not found",
        data: `Method '${method}' not found`,
      });
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      return res.end();
    }

    // Execute the handler
    const response = await handler(id, params);

    if (response) {
      console.log(
        "StreamableHTTP MCP response:",
        JSON.stringify(response, null, 2)
      );
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
    } else {
      // For notifications that don't require a response
      res.end();
    }
  } catch (error) {
    console.error("Error processing StreamableHTTP request:", error);
    const errorResponse = createJsonRpcResponse(id, null, {
      code: -32603,
      message: "Internal error",
      data: error.message,
    });
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
};

module.exports = { handleStreamableHttpRequest };
