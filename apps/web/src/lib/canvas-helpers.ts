import {
  type CanvasModuleItem,
  CanvasModuleItemType,
} from "@/lib/canvas-types";

export function moduleItemDetailsUrl(classId: string, item: CanvasModuleItem) {
  if (!item) return;
  if (item.type === CanvasModuleItemType.Assignment)
    return `/classes/${classId}/assignments/${item.content_id}`;
  if (item.type === CanvasModuleItemType.File)
    return `/classes/${classId}/files/${item.content_id}`;
  if (item.type === CanvasModuleItemType.Page)
    return `/classes/${classId}/pages/${item.page_url}`;
  if (item.type === CanvasModuleItemType.Quiz)
    return `/classes/${classId}/quizzes/${item.content_id}`;
  if (item.type === CanvasModuleItemType.ExternalUrl) return item.external_url;
  return item.html_url;
}
