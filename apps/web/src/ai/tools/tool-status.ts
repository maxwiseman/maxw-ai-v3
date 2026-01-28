import {
  type Icon,
  IconBrain,
  IconCards,
  IconCode,
  IconListCheck,
  IconListDetails,
  IconListSearch,
  IconNotebook,
  IconPlaylistX,
  IconWorld,
  IconWorldDownload,
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
};
