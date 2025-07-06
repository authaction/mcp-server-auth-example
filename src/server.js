const express = require("express");
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const dotenv = require("dotenv");
const cors = require("cors");
const fetch = require("node-fetch");
const { handleMcpRequest } = require("./mcp-handler");
const { handleStreamableHttpRequest } = require("./streamable-http-handler");

// Load environment variables from .env file
dotenv.config();

// Create an instance of the express app
const app = express();

app.use(cors());
app.use(express.json());

const appDomain = process.env.APP_DOMAIN || "http://localhost";
const port = process.env.PORT || 3000;
const resourceUrl = `${appDomain}:${port}`;

// Define your AuthAction-specific settings using environment variables
const authActionDomain = process.env.AUTHACTION_DOMAIN;
const authActionAudience = process.env.AUTHACTION_AUDIENCE;
const authactionIssuer = `https://${authActionDomain}/`;

// OAuth 2.0 Authorization Server Metadata (RFC 8414)
app.get("/.well-known/oauth-authorization-server", async (req, res) => {
  const response = await fetch(
    `https://${authActionDomain}/.well-known/openid-configuration`
  );
  const metadata = await response.json();

  res.json(metadata);
});

// OAuth 2.0 Protected Resource Metadata (RFC 9728)
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    resource: authActionAudience,
    authorization_servers: [`${resourceUrl}/.well-known/openid-configuration`],
    bearer_methods_supported: ["header"],
  });
});

// JWT middleware for authenticating requests
const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
  secret: jwksRsa.expressJwtSecret({
    cache: true, // Cache the signing key to improve performance
    rateLimit: true, // Limits the rate of key retrievals to prevent DoS attacks
    jwksRequestsPerMinute: 5, // Rate limit for JWKS endpoint requests
    jwksUri: `${authactionIssuer}.well-known/jwks.json`, // AuthAction's JWKS endpoint
  }),

  // Validate the audience and the issuer
  audience: authActionAudience,
  issuer: authactionIssuer,
  algorithms: ["RS256"], // RS256 is the algorithm typically used for JWTs signed with RSA keys
});

// Protected MCP endpoint with JWT authentication
app.post("/mcp", checkJwt, handleMcpRequest);

// StreamableHTTP endpoint for MCP inspector (with JWT authentication)
app.post("/mcp/stream", checkJwt, handleStreamableHttpRequest);

// Handle OPTIONS for StreamableHTTP endpoint
app.options("/mcp/stream", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.status(200).end();
});

// Public Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: "mcp-server",
    version: "1.0.0",
  });
});

// Public endpoint to check if server is running
app.get("/", (req, res) => {
  res.json({
    message: "MCP Server is running",
    endpoints: {
      mcp: "/mcp (POST, requires JWT)",
      mcpStream: "/mcp/stream (POST, StreamableHTTP, requires JWT)",
      health: "/health (GET)",
      oauthMetadata: "/.well-known/oauth-authorization-server (GET)",
      resourceMetadata: "/.well-known/oauth-protected-resource (GET)",
    },
  });
});

// Handle errors
app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err.name === "UnauthorizedError") {
    const WWW_AUTHENTICATE_HEADER = [
      'Bearer error="unauthorized"',
      'error_description="Authorization needed"',
      `resource_metadata="${resourceUrl}/.well-known/oauth-protected-resource"`,
    ].join(", ");

    return res
      .status(401)
      .set("WWW-Authenticate", WWW_AUTHENTICATE_HEADER)
      .json({ error: "unauthorized" });
  }

  next(err);
});

// Start server
app.listen(port, () => {
  console.log(`MCP HTTP Server running on ${resourceUrl}`);
  console.log(
    `Authorization Server: ${resourceUrl}/.well-known/oauth-authorization-server`
  );
  console.log(
    `Protected Resource Metadata: ${resourceUrl}/.well-known/oauth-protected-resource`
  );
  console.log(`Health Check: ${resourceUrl}/health`);
});

module.exports = app;
