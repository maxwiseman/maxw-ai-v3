/** biome-ignore-all lint/suspicious/noArrayIndexKey: questions/options don't have stable IDs */
"use client";

import type { ChatStatus } from "ai";
import { ChevronLeftIcon, ChevronRightIcon, GlobeIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { UserInputQuestion } from "@/ai/tools/codex/user-input";
import {
  type CommandMetadata,
  type CommandSelection,
  PromptCommands,
  PromptCommandsTextarea,
  useCommandActions,
} from "@/components/ai-elements/prompt-commands";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

export interface ChatInputMessage extends PromptInputMessage {
  agentChoice?: string;
  toolChoice?: string;
}

interface ChatInputProps {
  text?: string;
  setText?: (text: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  useWebSearch: boolean;
  setUseWebSearch: (value: boolean) => void;
  onSubmit: (message: ChatInputMessage) => void;
  status?: ChatStatus;
  hasMessages: boolean;
  pendingQuestion?: { questions: UserInputQuestion[] } | null;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: string;
    code?: string;
  } | null;
  className?: string;
}

// ─── Animate Change In Height ──────────────────────────────────────────────
// Smoothly animates its own height as children change size.
// Uses a callback ref (not useRef+useEffect) so the ResizeObserver attaches
// reliably on the first paint — avoiding the "missed initial measurement" bug.

function AnimateChangeInHeight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [height, setHeight] = useState<number | "auto">("auto");
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      observerRef.current = new ResizeObserver((entries) => {
        const h = entries[0]?.contentRect.height;
        if (h !== undefined) setHeight(h);
      });
      observerRef.current.observe(node);
    } else {
      observerRef.current?.disconnect();
    }
  }, []);

  return (
    <motion.div
      // Sync style.height and animate.height so Motion always has a concrete
      // starting value even before the first ResizeObserver callback fires.
      style={{ height, overflow: "hidden" }}
      animate={{ height }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <div ref={containerRef} className={className}>
        {children}
      </div>
    </motion.div>
  );
}

// ─── Pending Questions Widget ──────────────────────────────────────────────

// Tracks which direction we're navigating so the slide goes the right way
type SlideDirection = "forward" | "backward";

function QuestionBody({
  q,
  currentAnswer,
  currentOther,
  isLast,
  isSingleMCNoOther,
  onMCSelect,
  onOtherSelect,
  onAnswerChange,
  onKeyDown,
  formatAndSend,
}: {
  q: UserInputQuestion;
  currentAnswer: string;
  currentOther: boolean;
  isLast: boolean;
  isSingleMCNoOther: boolean;
  onMCSelect: (opt: string) => void;
  onOtherSelect: () => void;
  onAnswerChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  formatAndSend: () => void;
}) {
  return (
    <div className="w-full">
      {/* Question text */}
      <div className="mb-2.5">
        <p className="font-medium text-foreground text-lg leading-snug">
          {q.question}
        </p>
        {q.context && (
          <p className="mt-0.5 text-muted-foreground text-xs">{q.context}</p>
        )}
      </div>

      {/* Multiple choice */}
      {q.type === "multiple-choice" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((opt, oi) => (
              <Button
                key={oi}
                type="button"
                onClick={() => onMCSelect(opt)}
                variant="outline"
                className={cn(
                  "rounded-full bg-background",
                  currentAnswer === opt && !currentOther
                    ? "border-secondary! bg-secondary! text-foreground"
                    : "",
                )}
              >
                {opt}
              </Button>
            ))}
            <Button
              type="button"
              onClick={onOtherSelect}
              variant="outline"
              className={cn(
                "rounded-full bg-background",
                currentOther
                  ? "border-secondary! bg-secondary! text-foreground"
                  : "",
              )}
            >
              Other
            </Button>
          </div>
          {currentOther && (
            <Input
              type="text"
              placeholder="Type your answer…"
              value={currentAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={onKeyDown}
            />
          )}
        </div>
      )}

      {/* Short answer */}
      {q.type === "short-answer" && (
        <Textarea
          placeholder={q.placeholder ?? "Type your answer…"}
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          className="text-foreground"
        />
      )}

      {/* Submit button — only on last question (and not single auto-submit MC) */}
      {isLast && !isSingleMCNoOther && (
        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" onClick={formatAndSend}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}

function PendingQuestionsWidget({
  questions,
  onSendAnswer,
}: {
  questions: UserInputQuestion[];
  onSendAnswer: (text: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [otherSelected, setOtherSelected] = useState<Record<number, boolean>>(
    {},
  );
  const [direction, setDirection] = useState<SlideDirection>("forward");

  const total = questions.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  const q = questions[currentIndex];
  const currentAnswer = answers[currentIndex] ?? "";
  const currentOther = otherSelected[currentIndex] ?? false;

  const setAnswer = (i: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [i]: value }));

  const goTo = (i: number) => {
    setDirection(i > currentIndex ? "forward" : "backward");
    setCurrentIndex(i);
  };

  const advance = () => goTo(Math.min(currentIndex + 1, total - 1));
  const back = () => goTo(Math.max(currentIndex - 1, 0));

  const formatAndSend = (overrideAnswers?: Record<number, string>) => {
    const a = overrideAnswers ?? answers;
    const answered = questions
      .map((question, i) => ({ question, answer: (a[i] ?? "").trim() }))
      .filter(({ answer }) => answer.length > 0);

    if (answered.length === 0) {
      onSendAnswer("(skipped)");
      return;
    }
    if (total === 1) {
      onSendAnswer(answered[0].answer);
      return;
    }
    onSendAnswer(
      answered
        .map(({ question, answer }) => `**${question.question}**\n${answer}`)
        .join("\n\n"),
    );
  };

  const handleMCSelect = (option: string) => {
    const newAnswers = { ...answers, [currentIndex]: option };
    setAnswers(newAnswers);
    setOtherSelected((prev) => ({ ...prev, [currentIndex]: false }));
    if (total === 1) {
      formatAndSend(newAnswers);
      return;
    }
    if (!isLast) advance();
  };

  const handleOtherSelect = () => {
    setOtherSelected((prev) => ({ ...prev, [currentIndex]: true }));
    setAnswer(currentIndex, "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isLast) formatAndSend();
      else advance();
    }
  };

  const isSingleMCNoOther =
    total === 1 && q.type === "multiple-choice" && !currentOther;

  // Small directional nudge + opacity — no clipping needed, fully GPU-composited.
  // mode="popLayout" takes the exiting element out of flow, so the outer layout
  // div sees the entering element's height and FLIP-animates via CSS scale (no reflow).
  const slideVariants = {
    enter: (dir: SlideDirection) => ({
      x: dir === "forward" ? 14 : -14,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: SlideDirection) => ({
      x: dir === "forward" ? -14 : 14,
      opacity: 0,
    }),
  };

  return (
    <InputGroupAddon align="block-start" className="border-b p-3">
      <div className="flex w-full flex-col gap-3">
        {/* Header row: dots + counter + arrow buttons */}
        {total > 1 && (
          <div className="flex items-center justify-between">
            {/* Dots + counter */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === currentIndex
                      ? "w-4 bg-primary"
                      : (answers[i] ?? "").trim()
                        ? "w-1.5 bg-primary/50"
                        : "w-1.5 bg-border",
                  )}
                />
              ))}
              <span className="ml-1 text-muted-foreground text-xs">
                {currentIndex + 1} of {total}
              </span>
            </div>

            {/* Arrow nav buttons */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isFirst}
                onClick={back}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isLast}
                onClick={advance}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ResizeObserver-driven height animation — animates the outer container
            while mode="popLayout" keeps only the entering element in flow. */}
        <AnimateChangeInHeight className="w-full">
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ willChange: "transform, opacity" }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <QuestionBody
                q={q}
                currentAnswer={currentAnswer}
                currentOther={currentOther}
                isLast={isLast}
                isSingleMCNoOther={isSingleMCNoOther}
                onMCSelect={handleMCSelect}
                onOtherSelect={handleOtherSelect}
                onAnswerChange={(val) => setAnswer(currentIndex, val)}
                onKeyDown={handleKeyDown}
                formatAndSend={() => formatAndSend()}
              />
            </motion.div>
          </AnimatePresence>
        </AnimateChangeInHeight>
      </div>
    </InputGroupAddon>
  );
}

// ─── Chat Input ────────────────────────────────────────────────────────────

function ChatInputInner({
  setText,
  textareaRef,
  useWebSearch,
  setUseWebSearch,
  onSubmit,
  status,
  hasMessages,
  pendingQuestion,
  rateLimit,
  selection,
}: Omit<ChatInputProps, "text"> & {
  selection: CommandSelection;
}) {
  const { clearPills } = useCommandActions();
  const controller = usePromptInputController();

  const handleSubmit = (message: PromptInputMessage) => {
    console.log("ChatInput handleSubmit:", message);
    console.log("Controller value:", controller.textInput.value);
    console.log("Status:", status);

    // Merge message with command selection
    onSubmit({
      ...message,
      agentChoice: selection.agentChoice,
      toolChoice: selection.toolChoice,
    });

    // Clear pills after submit
    clearPills();
  };

  return (
    <PromptInput
      globalDrop
      multiple
      onSubmit={handleSubmit}
      className="bg-card/80 backdrop-blur-xl"
    >
      {pendingQuestion && (
        <PendingQuestionsWidget
          questions={pendingQuestion.questions}
          onSendAnswer={(text) => {
            onSubmit({
              text,
              agentChoice: selection.agentChoice,
              toolChoice: selection.toolChoice,
            });
          }}
        />
      )}
      <PromptInputBody>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
        <PromptCommandsTextarea
          onChange={(event) => {
            controller.textInput.setInput(event.target.value);
            if (setText) setText(event.target.value);
          }}
          ref={textareaRef}
          value={controller.textInput.value}
          placeholder={
            rateLimit?.code === "RATE_LIMIT_EXCEEDED"
              ? "Rate limit exceeded. Please try again tomorrow."
              : hasMessages
                ? undefined
                : "Ask me anything"
          }
          disabled={rateLimit?.code === "RATE_LIMIT_EXCEEDED"}
          autoFocus
        />
      </PromptInputBody>

      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputSpeechButton
            onTranscriptionChange={(text) => {
              controller.textInput.setInput(text);
              if (setText) setText(text);
            }}
            textareaRef={textareaRef}
          />
          <PromptInputButton
            onClick={() => setUseWebSearch(!useWebSearch)}
            variant={useWebSearch ? "secondary" : "ghost"}
          >
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={
            (!controller.textInput.value.trim() && !status) ||
            status === "streaming" ||
            rateLimit?.code === "RATE_LIMIT_EXCEEDED"
          }
          status={status}
          onClick={() => {
            console.log("Submit button clicked");
            console.log("Text value:", controller.textInput.value);
            console.log("Status:", status);
            console.log(
              "Disabled:",
              (!controller.textInput.value.trim() && !status) ||
                status === "streaming" ||
                rateLimit?.code === "RATE_LIMIT_EXCEEDED",
            );
          }}
        />
      </PromptInputToolbar>
    </PromptInput>
  );
}

export function ChatInput({
  text: _text,
  setText,
  textareaRef,
  useWebSearch,
  setUseWebSearch,
  onSubmit,
  status,
  hasMessages,
  pendingQuestion,
  rateLimit,
  className,
}: ChatInputProps) {
  const [metadata, setMetadata] = useState<CommandMetadata>({
    agents: [],
    tools: [],
  });
  const [selection, setSelection] = useState<CommandSelection>({});

  // Fetch metadata on mount
  useEffect(() => {
    fetch("/api/metadata")
      .then((res) => res.json())
      .then((data) => setMetadata(data))
      .catch((err) => console.error("Failed to fetch metadata:", err));
  }, []);

  return (
    <div className={className}>
      <PromptCommands metadata={metadata} onSelectionChange={setSelection}>
        <ChatInputInner
          setText={setText}
          textareaRef={textareaRef}
          useWebSearch={useWebSearch}
          setUseWebSearch={setUseWebSearch}
          onSubmit={onSubmit}
          status={status}
          hasMessages={hasMessages}
          pendingQuestion={pendingQuestion}
          rateLimit={rateLimit}
          selection={selection}
        />
      </PromptCommands>

      <div className="h-5">
        {rateLimit && rateLimit.remaining < 5 && (
          <div
            className={`border-border/50 border-t py-2 text-[11px] ${
              rateLimit.code === "RATE_LIMIT_EXCEEDED"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            <div className="flex w-full">
              <span>
                {rateLimit.code === "RATE_LIMIT_EXCEEDED"
                  ? "Rate limit exceeded - try again tomorrow"
                  : `Messages remaining: ${rateLimit.remaining} / ${rateLimit.limit}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
