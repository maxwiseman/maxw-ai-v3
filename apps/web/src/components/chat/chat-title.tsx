"use client";

import { useDataPart } from "ai-sdk-tools/client";
import { AnimatePresence, motion } from "motion/react";

interface ChatTitleData {
  chatId: string;
  title: string;
}

export function ChatTitle({ setTabTitle = true }: { setTabTitle?: boolean }) {
  const [chatTitle] = useDataPart<ChatTitleData>("chat-title", {
    onData: (dataPart) => {
      if (dataPart.data.title && setTabTitle) {
        document.title = `${dataPart.data.title} - maxw.ai`;
      }
    },
  });

  return (
    <AnimatePresence mode="wait">
      {chatTitle?.title && (
        <motion.div
          key={chatTitle.title}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="whitespace-nowrap font-medium text-foreground text-xs">
            {chatTitle.title}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
