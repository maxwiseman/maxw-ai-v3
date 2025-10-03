"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Streamdown } from "streamdown";

export function Flashcards() {
  return (
    <div className="size-full flex justify-center items-center p-4">
      {/* <Card className="max-w-2xl w-full aspect-[1.75] flex items-center justify-center flex-col">
        <div className="text-3xl font-semibold">Dot Product</div>
      </Card> */}
      <Flashcard>
        <FlashcardFront>Dot Product</FlashcardFront>
        <FlashcardBack>
          {`The dot product of two vectors is a scalar equal to the sum of the
            products of their corresponding components, or equivalently
            $$\(\\mathbf{a}\\cdot\\mathbf{b}=\|\\mathbf{a}\|\,\|\\mathbf{b}
            \|\\cos(\\theta)\)$$.`}
        </FlashcardBack>
      </Flashcard>
    </div>
  );
}

type FlashcardData = { side: "front" | "back" };
const FlashcardContext = createContext<
  FlashcardData & { update: Dispatch<SetStateAction<FlashcardData>> }
>({
  side: "front",
  update: () => null,
});
export function Flashcard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlashcardData>({ side: "front" });

  return (
    <FlashcardContext.Provider value={{ ...state, update: setState }}>
      <button
        onClick={() => {
          setState((prev) => ({
            ...prev,
            side: prev.side === "front" ? "back" : "front",
          }));
        }}
        className="grid grid-cols-1 [&>*]:col-start-1 [&>*]:row-start-1 max-w-2xl w-full aspect-[1.75] perspective-distant focus-visible:outline-none group"
      >
        {children}
      </button>
    </FlashcardContext.Provider>
  );
}

const sideClassName =
  "size-full flex items-center justify-center flex-col backface-hidden transition-transform duration-500 group-focus-visible:border-ring group-focus-visible:ring-ring/50 group-focus-visible:ring-[3px] p-8 overflow-x-clip overflow-y-auto";

export function FlashcardFront({
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { children?: string }) {
  const state = useContext(FlashcardContext);
  return (
    <Card
      className={cn(
        sideClassName,
        { "rotate-x-180": state.side === "back" },
        className
      )}
      {...props}
    >
      <Streamdown className="text-3xl font-medium">{children}</Streamdown>
    </Card>
  );
}

export function FlashcardBack({
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { children?: string }) {
  const state = useContext(FlashcardContext);
  return (
    <Card
      className={cn(
        sideClassName,
        { "-rotate-x-180": state.side === "front" },
        className
      )}
      {...props}
    >
      <Streamdown className="text-3xl font-medium">{children}</Streamdown>
    </Card>
  );
}
