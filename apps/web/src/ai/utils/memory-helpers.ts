/**
 * Memory Tool for Anthropic's Native Memory System
 * Implements filesystem-like operations for virtual memory files
 */

import { and, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { memory } from "@/db/schema/memory";

/**
 * Validate that path is within /memories directory
 * Prevents directory traversal attacks
 */
function validatePath(path: string): void {
  if (!path.startsWith("/memories")) {
    throw new Error("All memory paths must start with /memories");
  }

  // Check for traversal patterns
  if (
    path.includes("../") ||
    path.includes("..\\") ||
    path.includes("%2e%2e")
  ) {
    throw new Error("Invalid path: directory traversal detected");
  }
}

/**
 * Check if path is a file (has an extension) or directory
 */
function isFilePath(path: string): boolean {
  const parts = path.split("/");
  const lastPart = parts[parts.length - 1];
  return lastPart.includes(".");
}

/**
 * Get parent directory from path
 */
function getParentDir(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/memories";
}

/**
 * Calculate human-readable file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

/**
 * VIEW command: Show directory contents or file contents
 */
async function viewMemory(
  userId: string,
  path: string,
  viewRange?: [number, number],
): Promise<string> {
  validatePath(path);

  // If viewing a file
  if (isFilePath(path)) {
    const files = await db
      .select()
      .from(memory)
      .where(and(eq(memory.userId, userId), eq(memory.path, path)))
      .limit(1);

    if (files.length === 0) {
      return `The path ${path} does not exist. Please provide a valid path.`;
    }

    const file = files[0];
    const lines = file.content.split("\n");

    // Check line limit
    if (lines.length > 999999) {
      return `File ${path} exceeds maximum line limit of 999,999 lines.`;
    }

    // Apply view range if specified
    const startLine = viewRange ? viewRange[0] : 1;
    const endLine = viewRange ? viewRange[1] : lines.length;
    const selectedLines = lines.slice(startLine - 1, endLine);

    // Format with line numbers (6 chars, right-aligned, space-padded)
    const numberedLines = selectedLines
      .map((line, idx) => {
        const lineNum = (startLine + idx).toString().padStart(6, " ");
        return `${lineNum}\t${line}`;
      })
      .join("\n");

    return `Here's the content of ${path} with line numbers:\n${numberedLines}`;
  }

  // Viewing a directory
  const pattern = path === "/memories" ? "/memories/%" : `${path}/%`;
  const files = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), like(memory.path, pattern)));

  if (files.length === 0 && path !== "/memories") {
    // Check if this directory exists at all
    return `The path ${path} does not exist. Please provide a valid path.`;
  }

  // Build directory tree (up to 2 levels deep)
  const pathDepth = path.split("/").filter((p) => p).length;
  const items: { path: string; size: number }[] = [];

  // Add the directory itself
  items.push({ path, size: 4096 }); // Standard directory size

  // Group files by immediate subdirectories
  const seenPaths = new Set<string>();

  for (const file of files) {
    const relativeDepth = file.path.split("/").filter((p) => p).length;
    const depthDiff = relativeDepth - pathDepth;

    if (depthDiff <= 2) {
      // Within 2 levels
      if (depthDiff === 1) {
        // Direct child file
        if (!seenPaths.has(file.path)) {
          items.push({ path: file.path, size: file.content.length });
          seenPaths.add(file.path);
        }
      } else if (depthDiff === 2) {
        // File in subdirectory - add subdirectory if not seen
        const parts = file.path.split("/");
        const subdirPath = parts.slice(0, pathDepth + 1).join("/");
        if (!seenPaths.has(subdirPath)) {
          items.push({ path: subdirPath, size: 4096 });
          seenPaths.add(subdirPath);
        }
      }
    }
  }

  // Format output
  const listing = items
    .map((item) => `${formatSize(item.size)}\t${item.path}`)
    .join("\n");

  return `Here're the files and directories up to 2 levels deep in ${path}, excluding hidden items and node_modules:\n${listing}`;
}

/**
 * CREATE command: Create a new file
 */
async function createMemory(
  userId: string,
  path: string,
  fileText: string,
): Promise<string> {
  validatePath(path);

  // Check if file already exists
  const existing = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.path, path)))
    .limit(1);

  if (existing.length > 0) {
    return `Error: File ${path} already exists`;
  }

  // Create the file
  try {
    await db.insert(memory).values({
      id: crypto.randomUUID(),
      userId,
      path,
      content: fileText,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return `File created successfully at: ${path}`;
  } catch (error) {
    console.error("Memory insert error:", error);
    console.error("Attempted values:", {
      userId,
      path,
      contentLength: fileText.length,
    });
    throw error;
  }
}

/**
 * STR_REPLACE command: Replace text in a file
 */
async function replaceInMemory(
  userId: string,
  path: string,
  oldStr: string,
  newStr: string,
): Promise<string> {
  validatePath(path);

  const files = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.path, path)))
    .limit(1);

  if (files.length === 0) {
    return `Error: The path ${path} does not exist. Please provide a valid path.`;
  }

  const file = files[0];
  const lines = file.content.split("\n");

  // Find occurrences
  const occurrences: number[] = [];
  lines.forEach((line, idx) => {
    if (line.includes(oldStr)) {
      occurrences.push(idx + 1);
    }
  });

  if (occurrences.length === 0) {
    return `No replacement was performed, old_str \`${oldStr}\` did not appear verbatim in ${path}.`;
  }

  if (occurrences.length > 1) {
    return `No replacement was performed. Multiple occurrences of old_str \`${oldStr}\` in lines: ${occurrences.join(", ")}. Please ensure it is unique`;
  }

  // Perform replacement
  const newContent = file.content.replace(oldStr, newStr);

  await db
    .update(memory)
    .set({ content: newContent, updatedAt: new Date() })
    .where(eq(memory.id, file.id));

  // Return snippet of edited content
  const newLines = newContent.split("\n");
  const snippet = newLines
    .slice(0, 10)
    .map((line, idx) => `${(idx + 1).toString().padStart(6, " ")}\t${line}`)
    .join("\n");

  return `The memory file has been edited.\n${snippet}`;
}

/**
 * INSERT command: Insert text at a specific line
 */
async function insertInMemory(
  userId: string,
  path: string,
  insertLine: number,
  insertText: string,
): Promise<string> {
  validatePath(path);

  const files = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.path, path)))
    .limit(1);

  if (files.length === 0) {
    return `Error: The path ${path} does not exist`;
  }

  const file = files[0];
  const lines = file.content.split("\n");

  if (insertLine < 0 || insertLine > lines.length) {
    return `Error: Invalid \`insert_line\` parameter: ${insertLine}. It should be within the range of lines of the file: [0, ${lines.length}]`;
  }

  // Insert the text
  const newLines = [
    ...lines.slice(0, insertLine),
    insertText,
    ...lines.slice(insertLine),
  ];
  const newContent = newLines.join("\n");

  await db
    .update(memory)
    .set({ content: newContent, updatedAt: new Date() })
    .where(eq(memory.id, file.id));

  return `The file ${path} has been edited.`;
}

/**
 * DELETE command: Delete a file or directory
 */
async function deleteMemory(userId: string, path: string): Promise<string> {
  validatePath(path);

  if (isFilePath(path)) {
    // Delete single file
    const result = await db
      .delete(memory)
      .where(and(eq(memory.userId, userId), eq(memory.path, path)))
      .returning();

    if (result.length === 0) {
      return `Error: The path ${path} does not exist`;
    }
  } else {
    // Delete directory and all contents
    const pattern = `${path}/%`;
    await db
      .delete(memory)
      .where(and(eq(memory.userId, userId), like(memory.path, pattern)));
  }

  return `Successfully deleted ${path}`;
}

/**
 * RENAME command: Rename or move a file/directory
 */
async function renameMemory(
  userId: string,
  oldPath: string,
  newPath: string,
): Promise<string> {
  validatePath(oldPath);
  validatePath(newPath);

  // Check if source exists
  const source = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.path, oldPath)))
    .limit(1);

  if (source.length === 0) {
    return `Error: The path ${oldPath} does not exist`;
  }

  // Check if destination already exists
  const dest = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.path, newPath)))
    .limit(1);

  if (dest.length > 0) {
    return `Error: The destination ${newPath} already exists`;
  }

  // Perform rename
  await db
    .update(memory)
    .set({ path: newPath, updatedAt: new Date() })
    .where(and(eq(memory.userId, userId), eq(memory.path, oldPath)));

  return `Successfully renamed ${oldPath} to ${newPath}`;
}

/**
 * Main memory tool execute function
 */
export async function executeMemoryCommand(
  userId: string,
  action: any,
): Promise<string> {
  try {
    switch (action.command) {
      case "view":
        return await viewMemory(userId, action.path, action.view_range);
      case "create":
        return await createMemory(userId, action.path, action.file_text);
      case "str_replace":
        return await replaceInMemory(
          userId,
          action.path,
          action.old_str,
          action.new_str,
        );
      case "insert":
        return await insertInMemory(
          userId,
          action.path,
          action.insert_line,
          action.insert_text,
        );
      case "delete":
        return await deleteMemory(userId, action.path);
      case "rename":
        return await renameMemory(userId, action.old_path, action.new_path);
      default:
        return `Error: Unknown command ${action.command}`;
    }
  } catch (error) {
    console.error("Memory tool error:", error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
