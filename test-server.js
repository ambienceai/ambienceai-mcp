#!/usr/bin/env node

/**
 * Simple test script for the Ambience AI MCP Server
 *
 * Usage:
 *   export AMBIENCE_ACCESS_TOKEN="your-token-here"
 *   node test-server.js
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if token is set
if (!process.env.AMBIENCE_ACCESS_TOKEN) {
  console.error(
    "❌ Error: AMBIENCE_ACCESS_TOKEN environment variable is required",
  );
  console.error('Set it with: export AMBIENCE_ACCESS_TOKEN="your-token-here"');
  process.exit(1);
}

console.log("🧪 Testing Ambience AI MCP Server...\n");

const serverPath = join(__dirname, "dist", "index.js");

// Test cases
const tests = [
  {
    name: "List Tools",
    method: "tools/list",
    params: {},
  },
  {
    name: "Get Credits",
    method: "tools/call",
    params: {
      name: "get_credits",
      arguments: {},
    },
  },
  {
    name: "Generate Image (Test)",
    method: "tools/call",
    params: {
      name: "generate_image",
      arguments: {
        prompt: "A simple test image of a red apple",
        aspectRatio: "1:1",
      },
    },
  },
  {
    name: "Get Library",
    method: "tools/call",
    params: {
      name: "get_library",
      arguments: {
        limit: 3,
      },
    },
  },
];

async function runTest(test, index) {
  return new Promise((resolve, reject) => {
    console.log(`${index + 1}. Testing: ${test.name}`);

    const message = JSON.stringify({
      method: test.method,
      params: test.params,
    });

    const child = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let output = "";
    let error = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      error += data.toString();
    });

    child.on("close", (code) => {
      if (output) {
        try {
          const result = JSON.parse(output);
          console.log("✅ Success:", JSON.stringify(result, null, 2));
        } catch (e) {
          console.log("📄 Response:", output);
        }
      } else if (error) {
        console.log("❌ Error:", error);
      } else {
        console.log("⚠️  No response (this may be normal for some tests)");
      }
      console.log(""); // Empty line
      resolve();
    });

    child.on("error", (err) => {
      console.log("❌ Failed to start server:", err.message);
      console.log("");
      resolve();
    });

    // Send the test message
    child.stdin.write(message + "\n");
    child.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      child.kill();
      console.log("⏰ Test timed out");
      console.log("");
      resolve();
    }, 10000);
  });
}

async function runAllTests() {
  for (let i = 0; i < tests.length; i++) {
    await runTest(tests[i], i);
  }

  console.log("🎉 All tests completed!");
  console.log("\nTo test with the visual inspector, run:");
  console.log("npx @modelcontextprotocol/inspector node dist/index.js");
}

runAllTests().catch(console.error);
