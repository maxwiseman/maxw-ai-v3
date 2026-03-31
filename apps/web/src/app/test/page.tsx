import { Shimmer } from "@/components/ai-elements/shimmer";
import { type Frame, Matrix, pulse } from "@/components/ui/matrix";

const frames: Frame[] = [
  [
    [1, 1, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  [
    [0, 1, 1],
    [0, 0, 0],
    [0, 0, 0],
  ],
  [
    [0, 0, 1],
    [0, 0, 1],
    [0, 0, 0],
  ],
  [
    [0, 0, 0],
    [0, 0, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 0],
    [0, 0, 0],
    [0, 1, 1],
  ],
  [
    [0, 0, 0],
    [0, 0, 0],
    [1, 1, 0],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 0],
  ],
  [
    [1, 0, 0],
    [1, 0, 0],
    [0, 0, 0],
  ],
];

export default function Page() {
  return (
    <div className="flex items-center gap-3 p-6">
      <Matrix
        className="text-muted-foreground"
        blur={0}
        fps={6}
        size={3.5}
        gap={2}
        rows={3}
        cols={3}
        frames={frames}
      />
      <Shimmer>Thinking...</Shimmer>
    </div>
  );
}
