const { tools, toolHandlers } = require("./tools");

// MCP Protocol constants
const MCP_PROTOCOL_VERSION = "2025-06-18";

// Helper function to detect transport type from request
const getTransportType = (req) => {
  // Check query parameters for transport type
  if (req.query.transportType === "streamable-http") {
    return "streamable-http";
  }

  // Check headers for transport type
  const transportHeader = req.headers["x-mcp-transport"];
  if (transportHeader === "streamable-http") {
    return "streamable-http";
  }

  return "http";
};

// JSON-RPC 2.0 response helper
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

// MCP method handlers
const mcpHandlers = {
  initialize: (id) => {
    console.log("Handling initialize request");
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
    console.log("Handling tools/list request");
    return createJsonRpcResponse(id, {
      tools: tools,
    });
  },

  "roots/list": (id) => {
    console.log("Handling roots/list request");
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
    console.log("Handling tools/call request");
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
    console.log("Handling notification:", params);
    // MCP notifications don't require a response
    return null;
  },
};

// Main MCP request handler
const handleMcpRequest = async (req, res) => {
  const transportType = getTransportType(req);
  console.log(
    `MCP request received (transport: ${transportType}):`,
    JSON.stringify(req.body, null, 2)
  );

  // For StreamableHTTP, we need to handle the connection differently
  if (transportType === "streamable-http") {
    // Set headers for StreamableHTTP
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send initial connection established message
    res.write(
      'data: {"jsonrpc":"2.0","method":"notifications/notify","params":{"method":"connection/established"}}\n\n'
    );
  }

  // Validate basic JSON-RPC structure
  if (!req.body || typeof req.body !== "object") {
    const errorResponse = createJsonRpcResponse("1", null, {
      code: -32700,
      message: "Parse error",
      data: "Invalid JSON",
    });

    if (transportType === "streamable-http") {
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } else {
      return res.status(400).json(errorResponse);
    }
    return;
  }

  const { method, params, id, jsonrpc } = req.body;

  // Validate JSON-RPC 2.0 format
  if (jsonrpc !== "2.0") {
    const errorResponse = createJsonRpcResponse(id, null, {
      code: -32600,
      message: "Invalid Request",
      data: "Missing or invalid jsonrpc field",
    });

    if (transportType === "streamable-http") {
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } else {
      return res.status(400).json(errorResponse);
    }
    return;
  }

  if (!method || typeof method !== "string") {
    const errorResponse = createJsonRpcResponse(id, null, {
      code: -32600,
      message: "Invalid Request",
      data: "Missing or invalid method field",
    });

    if (transportType === "streamable-http") {
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } else {
      return res.status(400).json(errorResponse);
    }
    return;
  }

  try {
    const handler = mcpHandlers[method];

    if (!handler) {
      const errorResponse = createJsonRpcResponse(id, null, {
        code: -32601,
        message: "Method not found",
        data: `Method '${method}' not found`,
      });

      if (transportType === "streamable-http") {
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
      } else {
        return res.status(404).json(errorResponse);
      }
      return;
    }

    // Execute the handler
    const response = await handler(id, params);

    if (response) {
      console.log("MCP response:", JSON.stringify(response, null, 2));

      if (transportType === "streamable-http") {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      } else {
        return res.json(response);
      }
    } else {
      // For notifications that don't require a response
      if (transportType === "streamable-http") {
        res.end();
      } else {
        return res.status(200).end();
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);
    const errorResponse = createJsonRpcResponse(id, null, {
      code: -32603,
      message: "Internal error",
      data: error.message,
    });

    if (transportType === "streamable-http") {
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } else {
      return res.status(500).json(errorResponse);
    }
  }
};

module.exports = { handleMcpRequest };
