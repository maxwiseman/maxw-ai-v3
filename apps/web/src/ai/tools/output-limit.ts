/**
 * Tool output size limiter.
 *
 * Wraps any tool's `execute` function so that oversized results are replaced
 * with an informative error string instead of flooding the model's context window.
 *
 * Rules:
 *  - String results: capped at MAX_CHARS characters.
 *  - Object results with a `toModelOutput` handler: not limited here — the tool
 *    itself is responsible (e.g. view_file and web_fetch already handle this).
 *  - Object results without `toModelOutput`: capped at MAX_CHARS * 2 serialized chars.
 */

// biome-ignore lint/suspicious/noExplicitAny: intentionally loose wrapper
type AnyTool = Record<string, any>;

const MAX_CHARS = 100_000;

export function withOutputLimit(
  toolObj: AnyTool,
  maxChars = MAX_CHARS,
): AnyTool {
  const originalExecute = toolObj.execute;
  if (typeof originalExecute !== "function") return toolObj;

  const hasModelOutput = typeof toolObj.toModelOutput === "function";

  return {
    ...toolObj,
    execute: async (...args: unknown[]) => {
      // biome-ignore lint/suspicious/noExplicitAny: forwarding variadic args
      const result = await (
        originalExecute as (...a: any[]) => Promise<unknown>
      )(...args);

      if (typeof result === "string" && result.length > maxChars) {
        return (
          `Error: Tool output was too large (${result.length.toLocaleString()} characters). ` +
          `The limit is ${maxChars.toLocaleString()} characters. ` +
          "Use a more targeted approach to retrieve only the data you need."
        );
      }

      // Skip size check for object results that have a dedicated toModelOutput —
      // those tools manage their own payload (e.g. base64 media is expected to be large).
      if (typeof result === "object" && result !== null && !hasModelOutput) {
        const serialized = JSON.stringify(result);
        if (serialized.length > maxChars * 2) {
          return (
            `Error: Tool output was too large (${serialized.length.toLocaleString()} characters serialized). ` +
            `The limit is ${(maxChars * 2).toLocaleString()} characters. ` +
            "Use a more targeted approach to retrieve only the data you need."
          );
        }
      }

      return result;
    },
  };
}
