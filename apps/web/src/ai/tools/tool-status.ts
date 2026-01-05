import {
  type Icon,
  IconBrain,
  IconCards,
  IconListCheck,
  IconListDetails,
  IconListSearch,
  IconNotebook,
  IconPlaylistX,
  IconWorld,
} from "@tabler/icons-react";

export const toolStatus: Record<string, { icon: Icon; text: string }> = {
  updateWorkingMemory: {
    icon: IconBrain,
    text: "Updating memory",
  },
  createStudySet: {
    icon: IconCards,
    text: "Creating study set",
  },
  searchContent: {
    icon: IconNotebook,
    text: "Checking your assignments",
  },
  webSearch: {
    icon: IconWorld,
    text: "Searching the web",
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
  listTodos: {
    icon: IconListSearch,
    text: "Listing todo items",
  },
};
