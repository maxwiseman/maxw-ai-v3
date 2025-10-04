import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ToTitleCaseOptions {
  /**
   * Words to treat as "small" (lowercase when not first/last or following a colon).
   * Default includes common articles, conjunctions, and prepositions.
   */
  smallWords?: string[];
  /**
   * Preserve all-caps tokens as-is (e.g., "NASA").
   * Default: false (so ALL-UPPER input will be converted).
   */
  protectAcronyms?: boolean;
}

const DEFAULT_SMALL_WORDS = [
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "for",
  "nor",
  "on",
  "at",
  "to",
  "from",
  "by",
  "in",
  "of",
  "over",
  "per",
  "as",
  "vs",
  "via",
  "with",
  "is",
];

const isAllCaps = (s: string): boolean => /^[A-Z0-9]+$/.test(s);

const capitalizeApostropheParts = (
  str: string,
  protectAcronyms: boolean
): string => {
  // Keep apostrophes (straight and right single quote) as separators while capitalizing segments.
  return str
    .split(/('|’)/)
    .map((seg) => {
      if (seg === "'" || seg === "’") return seg;
      if (!seg) return seg;
      if (protectAcronyms && isAllCaps(seg)) return seg;
      return seg[0].toUpperCase() + seg.slice(1).toLowerCase();
    })
    .join("");
};

const capitalizeWord = (word: string, protectAcronyms: boolean): string => {
  if (!word) return word;
  // If protecting acronyms and this segment is all-caps, keep it.
  if (protectAcronyms && isAllCaps(word)) return word;
  return capitalizeApostropheParts(word, protectAcronyms);
};

export function toTitleCase(
  input: string,
  opts: ToTitleCaseOptions = {}
): string {
  if (typeof input !== "string") return String(input);
  const trimmed = input.trim();
  if (trimmed === "") return "";

  const smallSet = new Set(
    (opts.smallWords ?? DEFAULT_SMALL_WORDS).map((w) => w.toLowerCase())
  );
  const protectAcronyms =
    typeof opts.protectAcronyms === "boolean" ? opts.protectAcronyms : false;

  const tokens = trimmed.split(/\s+/);
  const lastIndex = tokens.length - 1;

  const processWord = (
    word: string,
    index: number,
    prevTokenEndsWithColon: boolean
  ): string => {
    // preserve leading/trailing non-alphanumeric characters (quotes, parentheses, punctuation)
    const leadingMatch = word.match(/^[^A-Za-z0-9]*/);
    const trailingMatch = word.match(/[^A-Za-z0-9]*$/);
    const leading = leadingMatch ? leadingMatch[0] : "";
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const core = word.slice(leading.length, word.length - trailing.length);

    if (!core) return word;

    // handle hyphenated words by segment
    if (core.includes("-")) {
      const parts = core.split("-");
      const processedParts = parts.map((part, partIndex) => {
        const lowerPart = part.toLowerCase();
        const isFirstPart = index === 0 && partIndex === 0;
        const isLastPart =
          index === lastIndex && partIndex === parts.length - 1;
        if (
          smallSet.has(lowerPart) &&
          !isFirstPart &&
          !isLastPart &&
          !prevTokenEndsWithColon
        ) {
          return lowerPart;
        }
        return capitalizeWord(part, protectAcronyms);
      });
      return leading + processedParts.join("-") + trailing;
    }

    const lowerCore = core.toLowerCase();
    const isFirst = index === 0;
    const isLast = index === lastIndex;

    if (
      smallSet.has(lowerCore) &&
      !isFirst &&
      !isLast &&
      !prevTokenEndsWithColon
    ) {
      return leading + lowerCore + trailing;
    }

    return leading + capitalizeWord(core, protectAcronyms) + trailing;
  };

  const resultTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const prev = i > 0 ? tokens[i - 1] : "";
    // If previous token ends exactly with ':' (no trailing quote after the colon),
    // treat this word as start of a new clause and capitalize small words.
    const prevEndsWithColon = /:$/.test(prev);
    resultTokens.push(processWord(tokens[i], i, prevEndsWithColon));
  }

  return resultTokens.join(" ");
}
