"use client";

import { useChatActions, useDataPart } from "ai-sdk-tools/client";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

type SuggestionsData = {
  prompts: string[];
};

interface PromptSuggestionsProps {
  delay?: number;
}

export function PromptSuggestions({ delay = 0 }: PromptSuggestionsProps = {}) {
  const [suggestions, clearSuggestions] =
    useDataPart<SuggestionsData>("suggestions");
  const { sendMessage } = useChatActions();

  const handlePromptClick = (prompt: string) => {
    clearSuggestions();
    sendMessage({ text: prompt });
  };

  if (!suggestions?.prompts || suggestions.prompts.length === 0) {
    return null;
  }

  const prompts = suggestions.prompts;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, delay, ease: "easeOut" }}
        className="pointer-events-auto mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {prompts.slice(0, 4).map((prompt, index) => (
          <motion.div
            key={prompt}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 0.2,
              delay: delay + index * 0.05, // Add base delay to stagger
              ease: "easeOut",
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePromptClick(prompt)}
              className="shrink-0 whitespace-nowrap rounded-full border border-border/50 bg-[#fafafa]/80 font-normal text-muted-foreground/60 text-xs backdrop-blur-sm hover:bg-accent hover:text-foreground dark:bg-background/70"
            >
              {prompt}
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
