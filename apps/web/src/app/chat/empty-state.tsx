import { motion } from "motion/react";
import type { ReactNode } from "react";
import { SuggestionPills } from "./suggestion-pills";

interface EmptyStateProps {
  children: ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-2xl space-y-8 px-4">
        <motion.h1
          className="text-center font-serif text-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          What would you like to know?
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {children}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <SuggestionPills />
        </motion.div>
      </div>
    </div>
  );
}
