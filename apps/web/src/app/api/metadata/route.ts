// @ts-ignore
import type { Agent } from "@ai-sdk-tools/agents";
import { generalAgent } from "@/ai/agents/general";
import { secretaryAgent } from "@/ai/agents/secretary";

import type { AppContext } from "@/ai/agents/shared";
import { studyAgent } from "@/ai/agents/study";

// Agent metadata interface
interface AgentMetadata {
  name: string;
  description: string;
  tools: string[];
}

interface ToolMetadata {
  name: string;
  description: string;
  agent: string;
}

interface MetadataResponse {
  agents: AgentMetadata[];
  tools: ToolMetadata[];
}

// Helper to extract tool names from an agent
function getToolNames(agent: Agent<AppContext>): string[] {
  if (!agent.configuredTools) return [];
  return Object.keys(agent.configuredTools).filter(
    (name) => name !== "handoff_to_agent" && name !== "updateWorkingMemory",
  );
}

// Agent configurations with descriptions
const agentRegistry = [
  {
    agent: generalAgent,
    description: "General conversation and assistance",
  },
  {
    agent: secretaryAgent,
    description: "Help with todos, tracking assignments, and more",
  },
  {
    agent: studyAgent,
    description: "Create flashcards, explain things, etc",
  },
];

export async function GET() {
  try {
    const agents: AgentMetadata[] = [];
    const tools: ToolMetadata[] = [];

    for (const { agent, description } of agentRegistry) {
      const toolNames = getToolNames(agent);

      agents.push({
        name: agent.name,
        description,
        tools: toolNames,
      });

      // Add tools with descriptions
      for (const toolName of toolNames) {
        tools.push({
          name: toolName,
          description: `${toolName} tool from ${agent.name} agent`,
          agent: agent.name,
        });
      }
    }

    const response: MetadataResponse = {
      agents,
      tools,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate metadata" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
