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
    const tools: ToolMetadata[] = [
      {
        name: "bash",
        description:
          "Run Daytona shell commands with persistent workspace files and cached Canvas data",
        agent: "general",
      },
      {
        name: "str_replace_based_edit_tool",
        description:
          "View, edit, and create files directly inside the Daytona sandbox",
        agent: "general",
      },
      {
        name: "web_search",
        description: "Search the web for current information (location-aware)",
        agent: "general",
      },
      {
        name: "web_fetch",
        description: "Fetch a webpage URL and read its contents in detail",
        agent: "general",
      },
      {
        name: "memory",
        description:
          "Store and recall user preferences or facts that matter across chats",
        agent: "general",
      },
      {
        name: "searchContent",
        description: "Semantic search across the student's Canvas courses and pages",
        agent: "general",
      },
      {
        name: "getClassAssignments",
        description: "List Canvas assignments for a class or all courses",
        agent: "general",
      },
      {
        name: "getTodos",
        description: "Return the user's todo list (today, upcoming, anytime, etc.)",
        agent: "general",
      },
      {
        name: "createTodo",
        description:
          "Create a scheduled todo tied to Canvas work, due dates, and subtasks",
        agent: "general",
      },
      {
        name: "updateTodo",
        description: "Edit an existing todo (status, dates, subtasks)",
        agent: "general",
      },
      {
        name: "deleteTodo",
        description: "Permanently remove a todo from the student's list",
        agent: "general",
      },
      {
        name: "createStudySet",
        description: "Generate flashcards and practice questions for study",
        agent: "general",
      },
      {
        name: "update_plan",
        description:
          "Write or update the persistent plan.md inside the Daytona sandbox",
        agent: "general",
      },
      {
        name: "apply_patch",
        description: "Apply a unified diff patch to sandbox files (precise edits)",
        agent: "general",
      },
      {
        name: "view_image",
        description: "Read and preview an image stored in the sandbox",
        agent: "general",
      },
      {
        name: "request_user_input",
        description:
          "Pause the agent and ask the human for missing clarification",
        agent: "general",
      },
      {
        name: "search_tools",
        description: "Search available tools and command descriptions",
        agent: "general",
      },
      {
        name: "spawn_agent",
        description:
          "Launch an isolated sub-agent with its own Daytona sandbox for experiments",
        agent: "general",
      },
      {
        name: "close_agent",
        description: "Stop and delete a previously spawned sub-agent sandbox",
        agent: "general",
      },
    ];

    const agents: AgentMetadata[] = [
      {
        name: "general",
        description:
          "Daytona-powered assistant with sandbox execution, Canvas/todo helpers, and planning tools",
        tools: tools.map((tool) => tool.name),
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
