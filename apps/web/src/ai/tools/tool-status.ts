import { type Icon, IconBrain, IconCards, IconNotebook } from "@tabler/icons-react";

export const toolStatus: Record<string, { icon: Icon; text: string }> = {
  updateWorkingMemory: {
    icon: IconBrain,
    text: "Updating memory",
  },
  createStudySet: {
    icon: IconCards,
    text: "Creating study set",
  },
  getAssignments: {
    icon: IconNotebook,
    text: "Checking your assignments",
  },
};
