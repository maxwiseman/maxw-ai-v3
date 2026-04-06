"use server";

import { headers } from "next/headers";
import { type CanvasClient } from "@maxw-ai/canvas";
import { auth } from "@/lib/auth";
import { getCanvasClient } from "@/lib/canvas-client";

async function getAuthedClient() {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return { error: "Unauthorized" as const };

  const result = await getCanvasClient(authData.user.id);
  if (result.error) return { error: result.error };

  return { canvas: result.canvas };
}

/**
 * Uploads a file to Canvas using the three-step process and returns the
 * resulting Canvas file ID.
 */
async function uploadFileToCanvas(
  file: File,
  courseId: string,
  canvas: CanvasClient,
): Promise<number> {
  // Step 1 — request upload URL from Canvas
  const target = await canvas.courses.files(Number(courseId)).initiate({
    name: file.name,
    size: file.size,
    content_type: file.type || "application/octet-stream",
    parent_folder_path: "unfiled",
  });

  // Step 2 — upload file bytes directly to the storage provider (S3, etc.)
  const uploadFormData = new FormData();
  for (const [k, v] of Object.entries(target.upload_params)) {
    uploadFormData.append(k, v as string);
  }
  uploadFormData.append("file", file);

  const uploadResponse = await fetch(target.upload_url, {
    method: "POST",
    body: uploadFormData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  // Step 3 — confirm the upload using the Location header from the upload response
  const locationHeader = uploadResponse.headers.get("location");
  if (!locationHeader) {
    throw new Error("Missing confirmation URL in upload response headers");
  }
  const confirmUrl = new URL(locationHeader, uploadResponse.url || target.upload_url).toString();

  const fileData = await canvas.courses
    .files(Number(courseId))
    .confirmUpload(confirmUrl);

  return fileData.id;
}

export async function submitTextEntry({
  classId,
  assignmentId,
  body,
  comment,
}: {
  classId: string;
  assignmentId: string;
  body: string;
  comment?: string;
}) {
  const res = await getAuthedClient();
  if ("error" in res) return { error: res.error };

  try {
    const submission = await res.canvas.courses
      .submissions(Number(classId))
      .submit(Number(assignmentId), {
        submission: { submission_type: "online_text_entry", body },
        ...(comment && { comment: { text_comment: comment } }),
      });
    return { success: true, submission };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to submit",
    };
  }
}

export async function submitFileUpload({
  classId,
  assignmentId,
  files,
  comment,
}: {
  classId: string;
  assignmentId: string;
  files: File[];
  comment?: string;
}) {
  const res = await getAuthedClient();
  if ("error" in res) return { error: res.error };

  try {
    const fileIds = await Promise.all(
      files.map((file) => uploadFileToCanvas(file, classId, res.canvas)),
    );

    const submission = await res.canvas.courses
      .submissions(Number(classId))
      .submit(Number(assignmentId), {
        submission: { submission_type: "online_upload", file_ids: fileIds },
        ...(comment && { comment: { text_comment: comment } }),
      });
    return { success: true, submission };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to submit",
    };
  }
}
