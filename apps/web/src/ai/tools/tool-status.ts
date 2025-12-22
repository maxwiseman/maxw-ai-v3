import {
  type Icon,
  IconBrain,
  IconCards,
  IconGlobe,
  IconNotebook,
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
    icon: IconGlobe,
    text: "Searching the web",
  },
};
