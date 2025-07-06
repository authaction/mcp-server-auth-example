const fetch = require("node-fetch");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testMCPEndpoint() {
  console.log("Testing MCP Server endpoints...\n");

  try {
    // Test health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log("Health check response:", healthData);
    console.log("✅ Health endpoint working\n");

    // Test root endpoint
    console.log("2. Testing root endpoint...");
    const rootResponse = await fetch(`${BASE_URL}/`);
    const rootData = await rootResponse.json();
    console.log("Root endpoint response:", rootData);
    console.log("✅ Root endpoint working\n");

    // Test OAuth metadata endpoints
    console.log("3. Testing OAuth metadata endpoints...");
    try {
      const oauthResponse = await fetch(
        `${BASE_URL}/.well-known/oauth-authorization-server`
      );
      const oauthData = await oauthResponse.json();
      console.log("OAuth metadata response:", oauthData);
      console.log("✅ OAuth metadata endpoint working");
    } catch (error) {
      console.log(
        "⚠️ OAuth metadata endpoint error (expected if AUTHACTION_DOMAIN not set):",
        error.message
      );
    }

    try {
      const resourceResponse = await fetch(
        `${BASE_URL}/.well-known/oauth-protected-resource`
      );
      const resourceData = await resourceResponse.json();
      console.log("Resource metadata response:", resourceData);
      console.log("✅ Resource metadata endpoint working\n");
    } catch (error) {
      console.log(
        "⚠️ Resource metadata endpoint error (expected if AUTHACTION_DOMAIN not set):",
        error.message
      );
    }

    // Test MCP endpoint (should fail without JWT)
    console.log("4. Testing MCP endpoint (should fail without JWT)...");
    try {
      const mcpResponse = await fetch(`${BASE_URL}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "initialize",
          params: {},
        }),
      });

      if (mcpResponse.status === 401) {
        console.log("✅ MCP endpoint correctly requires authentication");
      } else {
        const mcpData = await mcpResponse.json();
        console.log("MCP response:", mcpData);
      }
    } catch (error) {
      console.log("⚠️ MCP endpoint error:", error.message);
    }

    // Test StreamableHTTP MCP endpoint (should fail without JWT)
    console.log(
      "5. Testing StreamableHTTP MCP endpoint (should fail without JWT)..."
    );
    try {
      const streamResponse = await fetch(`${BASE_URL}/mcp/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "initialize",
          params: {},
        }),
      });

      if (streamResponse.status === 401) {
        console.log(
          "✅ StreamableHTTP endpoint correctly requires authentication"
        );
      } else {
        const streamText = await streamResponse.text();
        console.log("StreamableHTTP response:", streamText);
      }
    } catch (error) {
      console.log("⚠️ StreamableHTTP endpoint error:", error.message);
    }

    console.log("\n🎉 All tests completed!");
    console.log("\nTo test with authentication, you need to:");
    console.log(
      "1. Set up your .env file with AUTHACTION_DOMAIN and AUTHACTION_AUDIENCE"
    );
    console.log("2. Obtain a valid JWT token from your AuthAction provider");
    console.log(
      "3. Include the token in the Authorization header: Bearer <token>"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testMCPEndpoint();
