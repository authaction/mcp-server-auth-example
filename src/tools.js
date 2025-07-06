const tools = [
  {
    name: "echo",
    description: "Echo back the input text",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to echo back",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "time",
    description: "Get current server time",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "calculate",
    description: "Perform basic mathematical calculations",
    inputSchema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            "Mathematical expression to evaluate (e.g., '2 + 3 * 4')",
        },
      },
      required: ["expression"],
    },
  },
];

const toolHandlers = {
  echo: async (args) => {
    if (!args.text) {
      throw new Error("Missing required parameter: text");
    }
    return {
      content: [
        {
          type: "text",
          text: `Echo: ${args.text}`,
        },
      ],
    };
  },

  time: async (args) => {
    const currentTime = new Date().toISOString();
    return {
      content: [
        {
          type: "text",
          text: `Current server time: ${currentTime}`,
        },
      ],
    };
  },

  calculate: async (args) => {
    if (!args.expression) {
      throw new Error("Missing required parameter: expression");
    }

    try {
      // Use Function constructor for safer evaluation (still be careful with this in production)
      const result = Function(`"use strict"; return (${args.expression})`)();

      if (typeof result !== "number" || !isFinite(result)) {
        throw new Error("Invalid mathematical expression");
      }

      return {
        content: [
          {
            type: "text",
            text: `${args.expression} = ${result}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Calculation error: ${error.message}`);
    }
  },
};

module.exports = { tools, toolHandlers };
