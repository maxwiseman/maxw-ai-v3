/**
 * Multi-Agent Tools
 * Spawn isolated sub-agents that each get their own Daytona sandbox.
 * Sub-agents run synchronously (within the parent request) via generateText.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { Daytona } from "@daytonaio/sdk";
import { Redis } from "@upstash/redis";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { env } from "@/env";
import { createBashTool } from "../execution/bash";
import { createTextEditorTool } from "../execution/text-editor";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const daytona = new Daytona({ apiKey: env.DAYTONA_API_KEY });

const AGENT_REDIS_KEY = (agentId: string) => `sandbox:agent:${agentId}`;

export function createSpawnAgentTool() {
  return tool({
    description:
      "Spawn a focused sub-agent to handle a specific isolated task. The sub-agent gets its own sandboxed environment with bash and file editing tools. It runs synchronously and returns its final output. Use this for: parallel data processing, isolated code experiments, tasks that need a clean environment, or work that shouldn't pollute the main workspace.",
    inputSchema: z.object({
      instructions: z
        .string()
        .describe(
          "Complete task instructions for the sub-agent. Be specific — the agent has no context from the parent conversation.",
        ),
      files: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "Optional seed files to pre-populate the sub-agent's workspace. Keys are absolute paths (e.g. /home/daytona/workspace/input.txt), values are file contents.",
        ),
    }),
    execute: async ({ instructions, files }) => {
      const agentId = `sub-${crypto.randomUUID()}`;

      // Create a dedicated sandbox for this sub-agent
      const sandbox = await daytona.create({
        language: "python",
        autoStopInterval: 5, // auto-stop after 5 min
        autoArchiveInterval: 10,
      });
      await redis.set(AGENT_REDIS_KEY(agentId), sandbox.id, { ex: 3600 });

      try {
        // Seed files if provided
        if (files) {
          for (const [path, content] of Object.entries(files)) {
            await sandbox.fs.uploadFile(Buffer.from(content), path);
          }
        }

        // Run sub-agent using generateText with tool loop
        const result = await generateText({
          model: anthropic("claude-sonnet-4-6"),
          tools: {
            bash: createBashTool(agentId, agentId),
            str_replace_based_edit_tool: createTextEditorTool(agentId, agentId),
          },
          prompt: instructions,
          stopWhen: stepCountIs(30),
        });

        return result.text || "Sub-agent completed with no text output.";
      } finally {
        // Always clean up the sub-agent sandbox
        try {
          await sandbox.stop();
          await sandbox.delete();
        } catch {
          // Ignore cleanup errors
        }
        await redis.del(AGENT_REDIS_KEY(agentId));
      }
    },
  });
}

export function createCloseAgentTool() {
  return tool({
    description:
      "Stop and delete a sub-agent's sandbox by its agent ID. Useful for cleanup if a sub-agent was spawned and needs to be manually terminated.",
    inputSchema: z.object({
      agentId: z.string().describe("The agent ID returned by spawn_agent"),
    }),
    execute: async ({ agentId }) => {
      const sandboxId = await redis.get<string>(AGENT_REDIS_KEY(agentId));
      if (!sandboxId) {
        return `No active sandbox found for agent ${agentId}.`;
      }

      try {
        const sandbox = await daytona.get(sandboxId);
        await sandbox.stop();
        await sandbox.delete();
      } catch {
        // Sandbox may already be stopped/deleted
      }

      await redis.del(AGENT_REDIS_KEY(agentId));
      return `Agent ${agentId} terminated and sandbox deleted.`;
    },
  });
}
