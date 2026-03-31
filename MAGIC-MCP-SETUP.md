# 21st-dev Magic MCP — Setup Instructions

## Step 1: Get your API key
Go to: https://21st.dev/magic/console
Sign up or log in, then generate an API key.

## Step 2: Run this command in your terminal
Replace YOUR_KEY_HERE with the key from Step 1:

```bash
npx @21st-dev/cli@latest install claude --api-key YOUR_KEY_HERE
```

That's it. The CLI will automatically configure everything.

## Manual alternative
If the CLI doesn't work, add this to `~/.claude/mcp_config.json`:

```json
{
  "mcpServers": {
    "@21st-dev/magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": {
        "API_KEY": "YOUR_KEY_HERE"
      }
    }
  }
}
```

## Note
This requires a 21st.dev API key (NOT an OpenAI key). They are different services.
