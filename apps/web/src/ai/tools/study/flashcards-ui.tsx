"use client";

import type * as z from "zod";
import type { createStudySetToolInput } from "./flashcards";
import {
  Flashcard,
  FlashcardBack,
  FlashcardFront,
} from "@/app/study/[id]/flashcards";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconCards, IconCheckbox, IconPencil } from "@tabler/icons-react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { useChatStatus } from "ai-sdk-tools";
// import { useArtifacts } from "ai-sdk-tools/client";

export function FlashcardToolDisplay({
  toolData,
}: {
  toolData: Partial<z.infer<typeof createStudySetToolInput>>;
}) {
  const chatStatus = useChatStatus();
  //   const { byType } = useArtifacts();
  if ((toolData?.items?.length ?? 0) < 1) return null;

  return (
    <div className="w-full space-y-2">
      <div
        // style={{
        //   maskImage:
        //     "linear-gradient(90deg,#000,#000,transparent 0,#000 calc(var(--spacing) * 8),#000 calc(100% - calc(var(--spacing) * 8)),transparent)",
        // }}
        className="scroll-shadow-x snap-x snap-mandatory overflow-y-visible overflow-x-scroll"
      >
        <div className="flex flex-1 gap-4">
          {toolData?.items
            ?.filter((item) => item?.type && item.type === "term")
            .map((item) => (
              <Flashcard
                key={item.term}
                className="h-full w-full max-w-lg shrink-0 snap-center"
              >
                <FlashcardFront className="">{item.term}</FlashcardFront>
                <FlashcardBack className="text-lg">
                  {item.fullDefinition}
                </FlashcardBack>
              </Flashcard>
            ))}
        </div>
      </div>
      <Item className="mb-6 p-0">
        <ItemContent className="gap-0">
          <ItemTitle className="font-bold text-lg">
            {toolData.title ?? "Untitled"}
          </ItemTitle>
          <ItemDescription className="text-base">
            Draft Study Set
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select
            disabled={chatStatus === "streaming"}
            defaultValue="flashcards"
          >
            <SelectTrigger>
              <SelectValue placeholder="Study mode..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flashcards">
                <IconCards className="size-4 text-muted-foreground" />
                Flashcards
              </SelectItem>
              <SelectItem value="short-answer">
                <IconPencil className="size-4 text-muted-foreground" />
                Short Answer
              </SelectItem>
              <SelectItem value="multiple-choice">
                <IconCheckbox className="size-4 text-muted-foreground" />
                Multiple Choice
              </SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={chatStatus === "streaming"}>Save</Button>
        </ItemActions>
      </Item>
    </div>
  );
  //   return (
  //     <div className="w-full space-y-2">
  //       <Carousel className="*:-mx-8 *:!overflow-visible *:!overflow-x-clip w-full *:px-8">
  //         <CarouselContent
  //           rootProps={{
  //             style: {
  //               maskImage:
  //                 "linear-gradient(90deg,#000,#000,transparent 0,#000 calc(var(--spacing) * 8),#000 calc(100% - calc(var(--spacing) * 8)),transparent)",
  //             },
  //           }}
  //           className="py-2"
  //         >
  //           {toolData?.items
  //             ?.filter((item) => item?.type && item.type === "term")
  //             .map((item) => (
  //               <CarouselItem className="w-full max-w-max" key={item.term ?? ""}>
  //                 <Flashcard className="h-full max-w-lg">
  //                   <FlashcardFront>{item.term}</FlashcardFront>
  //                   <FlashcardBack className="text-lg">
  //                     {item.fullDefinition
  //                       ?.replaceAll(/\\\[|\\\]/g, "$$$$")
  //                       .replaceAll(/\\\(|\\\)/g, "$$$$")}
  //                   </FlashcardBack>
  //                 </Flashcard>
  //               </CarouselItem>
  //             ))}
  //         </CarouselContent>
  //         <CarouselPrevious className="!px-0" />
  //         <CarouselNext className="!px-0" />
  //       </Carousel>
  //       <Item className="mb-6 p-0">
  //         <ItemContent className="gap-0">
  //           <ItemTitle className="font-bold text-lg">
  //             {toolData.title ?? "Untitled"}
  //           </ItemTitle>
  //           <ItemDescription className="text-base">
  //             Draft Study Set
  //           </ItemDescription>
  //         </ItemContent>
  //         <ItemActions>
  //           <Select
  //             disabled={chatStatus === "streaming"}
  //             defaultValue="flashcards"
  //           >
  //             <SelectTrigger>
  //               <SelectValue placeholder="Study mode..." />
  //             </SelectTrigger>
  //             <SelectContent>
  //               <SelectItem value="flashcards">
  //                 <IconCards className="size-4 text-muted-foreground" />
  //                 Flashcards
  //               </SelectItem>
  //               <SelectItem value="short-answer">
  //                 <IconPencil className="size-4 text-muted-foreground" />
  //                 Short Answer
  //               </SelectItem>
  //               <SelectItem value="multiple-choice">
  //                 <IconCheckbox className="size-4 text-muted-foreground" />
  //                 Multiple Choice
  //               </SelectItem>
  //             </SelectContent>
  //           </Select>
  //           <Button disabled={chatStatus === "streaming"}>Save</Button>
  //         </ItemActions>
  //       </Item>
  //     </div>
  //   );
}
