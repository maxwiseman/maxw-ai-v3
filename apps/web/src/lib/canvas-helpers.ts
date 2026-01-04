import type { CanvasModuleItem } from "@/types/canvas";

export function moduleItemDetailsUrl(classId: string, item: CanvasModuleItem) {
  if (!item) return;
  if (item.type === "Assignment")
    return `/classes/${classId}/assignments/${item.content_id}`;
  if (item.type === "File")
    return `/classes/${classId}/files/${item.content_id}`;
  if (item.type === "Page") return `/classes/${classId}/pages/${item.page_url}`;
  if (item.type === "Quiz")
    return `/classes/${classId}/quizzes/${item.content_id}`;
  if (item.type === "Discussion")
    return `/classes/${classId}/discussions/${item.content_id}`;
  if (item.type === "ExternalUrl") return item.external_url;
  return item.html_url;
}
