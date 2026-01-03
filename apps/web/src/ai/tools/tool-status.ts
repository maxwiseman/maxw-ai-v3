import {
  type Icon,
  IconBrain,
  IconCards,
  IconNotebook,
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
};
