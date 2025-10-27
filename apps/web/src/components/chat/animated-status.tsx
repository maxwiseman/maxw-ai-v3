"use client";

import type { Icon } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { Shimmer } from "../ai-elements/shimmer";

interface AnimatedStatusProps {
  text: string | null;
  shimmerDuration?: number;
  className?: string;
  fadeDuration?: number;
  /** Animation variant for status changes */
  variant?: "fade" | "slide" | "scale" | "blur-fade";
  /** Optional icon to display before the text */
  icon?: Icon | null;
}

export function AnimatedStatus({
  text,
  shimmerDuration = 1,
  className,
  fadeDuration = 0.2,
  variant = "slide",
  icon: Icon,
}: AnimatedStatusProps) {
  // Animation variants for different effects
  const animations = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slide: {
      initial: { opacity: 0, x: 10 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -10 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
    "blur-fade": {
      initial: { opacity: 0, filter: "blur(4px)" },
      animate: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: "blur(4px)" },
    },
  };

  const selectedAnimation = animations[variant];

  return (
    <div className="relative flex h-8 items-center whitespace-nowrap">
      <AnimatePresence mode="wait">
        {text && (
          <motion.div
            key={text} // Re-mount when text changes to trigger animation
            initial={selectedAnimation.initial}
            animate={selectedAnimation.animate}
            exit={selectedAnimation.exit}
            transition={{
              duration: fadeDuration,
              ease: "easeInOut",
            }}
            className="flex items-center gap-1.5 text-muted-foreground dark:text-[#666666]"
          >
            {Icon && <Icon className="size-4 shrink-0 text-current" />}
            <Shimmer className={className} duration={shimmerDuration}>
              {text || ""}
            </Shimmer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
