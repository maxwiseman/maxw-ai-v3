import {
  type Icon,
  IconBrain,
  IconCards,
  IconCode,
  IconEdit,
  IconHelpCircle,
  IconLayersLinked,
  IconListCheck,
  IconListDetails,
  IconListSearch,
  IconNotebook,
  IconPhoto,
  IconPlaylistX,
  IconSearch,
  IconTerminal,
  IconUpload,
  IconWorld,
  IconWorldDownload,
  IconX,
} from "@tabler/icons-react";

export const toolStatus: Record<string, { icon: Icon; text: string }> = {
  memory: {
    icon: IconBrain,
    text: "Remembering",
  },
  createStudySet: {
    icon: IconCards,
    text: "Creating study set",
  },
  searchContent: {
    icon: IconNotebook,
    text: "Checking your assignments",
  },
  getClassAssignments: {
    icon: IconNotebook,
    text: "Listing your assignments",
  },
  web_search: {
    icon: IconWorld,
    text: "Searching the web",
  },
  web_fetch: {
    icon: IconWorldDownload,
    text: "Fetching webpage",
  },
  code_execution: {
    icon: IconCode,
    text: "Writing code",
  },
  createTodo: {
    icon: IconListDetails,
    text: "Creating todo item",
  },
  updateTodo: {
    icon: IconListCheck,
    text: "Updating todo item",
  },
  deleteTodo: {
    icon: IconPlaylistX,
    text: "Deleting todo item",
  },
  getTodos: {
    icon: IconListSearch,
    text: "Listing todo items",
  },
  bash: {
    icon: IconTerminal,
    text: "Running shell commands",
  },
  str_replace_based_edit_tool: {
    icon: IconEdit,
    text: "Editing files",
  },
  update_plan: {
    icon: IconNotebook,
    text: "Updating plan",
  },
  apply_patch: {
    icon: IconCode,
    text: "Applying patch",
  },
  view_image: {
    icon: IconPhoto,
    text: "Viewing image",
  },
  request_user_input: {
    icon: IconHelpCircle,
    text: "Requesting clarification",
  },
  search_tools: {
    icon: IconSearch,
    text: "Searching tools",
  },
  spawn_agent: {
    icon: IconLayersLinked,
    text: "Spawning sub-agent",
  },
  close_agent: {
    icon: IconX,
    text: "Closing sub-agent",
  },
  share_file: {
    icon: IconUpload,
    text: "Sharing file",
  },
};
