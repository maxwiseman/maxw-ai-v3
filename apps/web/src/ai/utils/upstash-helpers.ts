"use server";

import { Search } from "@upstash/search";
import {
  getAllCanvasCourses,
  getAssignment,
  getPage,
} from "@/app/classes/classes-actions";
import { extractKeys } from "@/lib/utils";
import { env } from "@/env";
import TurndownService from "turndown";

// Constants
const MAX_DOCUMENT_SIZE = 4000;
const CHUNK_BUFFER_SIZE = 100;
const RUBRIC_STRIP_THRESHOLD = 200;
const MIN_CHUNK_SIZE = 100;
const UPSERT_BATCH_SIZE = 100;
const SEARCH_RESULT_LIMIT = 4;

// Upstash client setup
const client = new Search({
  url: env.UPSTASH_SEARCH_URL,
  token: env.UPSTASH_SEARCH_TOKEN,
});

const index = client.index("canvas");

// HTML to Markdown converter
const turndownService = new TurndownService();

type DocumentChunk = {
  id: string;
  metadata: Record<string, unknown>;
  content: Record<string, unknown>;
};

/**
 * Converts HTML fields (description, body) to Markdown format
 */
function convertHtmlToMarkdown(
  content: Record<string, unknown>
): Record<string, unknown> {
  const converted = { ...content };

  const htmlFields = ["description", "body"] as const;
  for (const field of htmlFields) {
    if (field in converted && typeof converted[field] === "string") {
      converted[field] = turndownService
        .turndown(converted[field] as string)
        .replaceAll(" ", "");
    }
  }

  return converted;
}

/**
 * Identifies the largest text field in the content that can be split
 */
function findLargeTextField(
  content: Record<string, unknown>
): "description" | "body" | null {
  if ("description" in content && typeof content.description === "string") {
    return "description";
  }
  if ("body" in content && typeof content.body === "string") {
    return "body";
  }
  return null;
}

/**
 * Removes non-essential fields if base content is too large
 */
function optimizeBaseContent(
  baseContent: Record<string, unknown>
): Record<string, unknown> {
  const baseStr = JSON.stringify(baseContent);
  if (baseStr.length > MAX_DOCUMENT_SIZE - RUBRIC_STRIP_THRESHOLD) {
    if ("rubric" in baseContent) {
      const optimized = { ...baseContent };
      delete optimized.rubric;
      return optimized;
    }
  }
  return baseContent;
}

/**
 * Splits a document into chunks if it exceeds the maximum size.
 * Large text fields (description/body) are split while preserving metadata.
 */
function splitDocument(
  id: string,
  metadata: Record<string, unknown>,
  content: Record<string, unknown>
): DocumentChunk[] {
  const contentSize = JSON.stringify(content).length;
  if (contentSize < MAX_DOCUMENT_SIZE) {
    return [{ id, metadata, content }];
  }

  const largeField = findLargeTextField(content);
  if (!largeField) {
    console.warn(
      `Content for ${id} exceeds size limit but no splittable text field found.`
    );
    return [{ id, metadata, content }];
  }

  const baseContent = { ...content };
  const fullText = baseContent[largeField] as string;
  delete baseContent[largeField];

  const optimizedBase = optimizeBaseContent(baseContent);
  const baseSize = JSON.stringify(optimizedBase).length;
  const availableChunkSize = MAX_DOCUMENT_SIZE - baseSize - CHUNK_BUFFER_SIZE;
  const chunkSize = Math.max(availableChunkSize, MIN_CHUNK_SIZE);

  const chunks: DocumentChunk[] = [];
  let offset = 0;
  let chunkIndex = 0;

  while (offset < fullText.length) {
    const textSegment = fullText.slice(offset, offset + chunkSize);

    chunks.push({
      id: `${id}-${chunkIndex}`,
      metadata,
      content: {
        ...optimizedBase,
        [largeField]: textSegment,
      },
    });

    offset += chunkSize;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Processes assignments for a course into searchable documents
 */
async function processAssignments(course: {
  id: number;
  name: string;
  original_name?: string | null;
}): Promise<DocumentChunk[]> {
  const assignments = await getAssignment({
    classId: course.id.toString(),
  });

  const validAssignments = assignments.filter(
    (item): item is Exclude<typeof item, { message?: string }> =>
      !("message" in item)
  );

  return validAssignments.flatMap((assignment) => {
    const id = `assignment-${assignment.id.toString()}`;
    const metadata = { classId: course.id, type: "assignment" };
    const content = {
      ...convertHtmlToMarkdown(
        extractKeys(assignment, [
          "name",
          "description",
          "due_at",
          "allowed_attempts",
          "lock_at",
          "rubric",
        ])
      ),
      className: course.original_name ?? course.name,
    };
    return splitDocument(id, metadata, content);
  });
}

/**
 * Processes pages for a course into searchable documents
 */
async function processPages(course: {
  id: number;
  name: string;
  original_name?: string | null;
}): Promise<DocumentChunk[]> {
  const pagesResult = await getPage({ classId: course.id.toString() });
  if (!Array.isArray(pagesResult)) {
    return [];
  }

  const validPages = pagesResult.filter(
    (
      item
    ): item is Exclude<
      typeof item,
      { message: "That page has been disabled for this course" }
    > => !("message" in item)
  );

  return validPages.flatMap((page) => {
    const id = `page-${page.page_id.toString()}`;
    const metadata = { classId: course.id, type: "page" };
    const content = {
      ...convertHtmlToMarkdown(
        extractKeys(page, ["body", "title", "todo_date", "updated_at"])
      ),
      className: course.original_name ?? course.name,
    };
    return splitDocument(id, metadata, content);
  });
}

/**
 * Processes all documents for a single course
 */
async function processCourseDocuments(course: {
  id: number;
  name: string;
  original_name?: string | null;
}): Promise<DocumentChunk[]> {
  const [assignments, pages] = await Promise.all([
    processAssignments(course),
    processPages(course),
  ]);

  return [...assignments, ...pages];
}

/**
 * Upserts documents to the search index in batches
 */
async function upsertDocuments(documents: DocumentChunk[]): Promise<void> {
  for (let i = 0; i < documents.length; i += UPSERT_BATCH_SIZE) {
    await index.upsert(documents.slice(i, i + UPSERT_BATCH_SIZE));
  }
}

/**
 * Updates the Canvas search index with all courses, assignments, and pages.
 * Returns the processed documents or an error message.
 */
export async function updateCanvasIndex(): Promise<DocumentChunk[] | string> {
  const courses = await getAllCanvasCourses();
  if (typeof courses === "string") {
    return courses;
  }

  const documentPromises = courses.map(processCourseDocuments);
  const allDocuments = (await Promise.all(documentPromises)).flat();

  await upsertDocuments(allDocuments);

  return allDocuments;
}

/**
 * Queries the Canvas search index with optional class filtering
 */
export async function queryCanvasIndex(
  query: string,
  classIds?: string[]
): Promise<unknown> {
  const filter = classIds
    ? `classId IN (${classIds.map((id) => `'${id}'`).join(", ")})`
    : undefined;

  return await index.search({
    query,
    filter,
    reranking: true,
    limit: SEARCH_RESULT_LIMIT,
  });
}
