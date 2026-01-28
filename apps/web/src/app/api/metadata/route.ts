/**
 * Agent Metadata API
 * Returns information about available agents and their tools
 * NOTE: Simplified for new architecture - only general agent is active
 */

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

export async function GET() {
  try {
    // Hardcoded metadata for the new general agent
    const agents: AgentMetadata[] = [
      {
        name: "general",
        description:
          "AI assistant with web search, code execution, Canvas LMS integration, and study tools",
        tools: [
          "code_execution",
          "web_search",
          "searchContent",
          "createStudySet",
        ],
      },
    ];

    const tools: ToolMetadata[] = [
      {
        name: "code_execution",
        description:
          "Run Python code for calculations, data processing, and programmatic tool calling",
        agent: "general",
      },
      {
        name: "web_search",
        description: "Search the web for current information (location-aware)",
        agent: "general",
      },
      {
        name: "searchContent",
        description: "Search Canvas LMS content (assignments, pages, syllabus)",
        agent: "general",
      },
      {
        name: "createStudySet",
        description: "Create flashcards and practice questions for studying",
        agent: "general",
      },
    ];

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
