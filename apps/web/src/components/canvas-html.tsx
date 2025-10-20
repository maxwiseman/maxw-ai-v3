/** biome-ignore-all lint/performance/noImgElement: <explanation> */
import { IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import React from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeParse from "rehype-parse";
import rehypeReact from "rehype-react";
import { unified } from "unified";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
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
                  ?.join("") ?? ""
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
          latex ? (
            <InlineMath math={latex} />
          ) : (
            // biome-ignore lint/a11y/useAltText: This may be already provided by the HTML props
            <img {...props} className="mx-auto max-w-lg" />
          ),
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
