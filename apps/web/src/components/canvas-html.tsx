import { IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeParse from "rehype-parse";
import rehypeReact from "rehype-react";
import { unified } from "unified";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import Image from "next/image";
import { InlineMath } from "react-katex";

export function CanvasHTML({
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { children?: string }) {
  if (!children) return null;

  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeReact, {
      jsx: jsx,
      jsxs: jsxs,
      Fragment: Fragment,
      components: {
        a: ({ href, ...props }: ComponentProps<"a">) =>
          new RegExp(/.*instructure.com.*/).test(href ?? "") ? (
            <Link
              {...props}
              // @ts-expect-error -- It's fine if it's an external link
              href={
                href
                  ?.match(/^https?:\/\/(?:[^/]+\.)?instructure\.com(\/.*)?$/)
                  ?.join("")
                  .replace("courses", "classes") ?? ""
              }
              target="_blank"
            />
          ) : (
            <span className="inline-flex items-center gap-1">
              <a {...props} href={href} target="_blank" />
              <IconExternalLink className="size-4" />
            </span>
          ),

        img: ({
          "data-equation-content": latex,
          ...props
        }: ComponentProps<"img"> & { "data-equation-content"?: string }) =>
          latex ? <InlineMath math={latex} /> : <CanvasImage {...props} />,
      },
    });

  // Process to React nodes
  const result = processor.processSync(children).result;

  return (
    <div
      className={cn(
        "prose dark:prose-invert prose-neutral **:wrap-anywhere w-full max-w-full [&_img.equation\\_image]:invert [&_img]:inline-block",
        className,
      )}
      {...props}
    >
      {result}
    </div>
  );
}

function CanvasImage(props: ComponentProps<"img">) {
  const width = Number.isNaN(Number(props.width))
    ? undefined
    : Number(props.width);
  const height = Number.isNaN(Number(props.height))
    ? undefined
    : Number(props.height);

  if (
    typeof props.src === "string" &&
    /https:\/\/.*\.instructure\.com.*/.test(props.src ?? "")
  ) {
    return (
      <span className="mx-auto block size-max max-w-lg">
        {/* @ts-expect-error */}
        <Image
          alt=""
          src=""
          {...props}
          width={width}
          ref={undefined}
          height={height}
          fill={height === undefined && width === undefined}
          loading="eager"
          className="relative! inset-0"
        />
      </span>
    );
  }

  return (
    <span className="mx-auto block size-max max-w-lg">
      {/** biome-ignore lint/performance/noImgElement: If the URL isn't trusted, we don't want to host it on our own servers */}
      <img {...props} alt={props.alt ?? ""} width={width} height={height} />
    </span>
  );
}
