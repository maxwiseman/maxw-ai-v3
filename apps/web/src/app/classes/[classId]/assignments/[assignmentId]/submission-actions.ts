"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";

interface SubmitTextEntryParams {
  classId: string;
  assignmentId: string;
  body: string;
  comment?: string;
}

interface SubmitFileUploadParams {
  classId: string;
  assignmentId: string;
  fileIds: number[];
  comment?: string;
}

async function getCanvasSettings() {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) {
    return { error: "Unauthorized" as const };
  }

  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain) {
    return { error: "Settings not configured" as const };
  }

  return {
    apiKey: settings.canvasApiKey,
    domain: settings.canvasDomain,
    userId: authData.user.id,
  };
}

/**
 * Upload a file to Canvas and return the file ID
 */
async function uploadFileToCanvas(
  file: File,
  courseId: string,
  apiKey: string,
  domain: string,
): Promise<number> {
  // Step 1: Get upload URL and parameters
  const uploadUrlResponse = await fetch(
    `https://${domain}/api/v1/courses/${courseId}/files`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        content_type: file.type || "application/octet-stream",
        parent_folder_path: "unfiled",
      }),
    },
  );

  if (!uploadUrlResponse.ok) {
    const error = await uploadUrlResponse.json().catch(() => ({}));
    throw new Error(
      `Failed to get upload URL: ${error.message || uploadUrlResponse.statusText}`,
    );
  }

  const uploadData = await uploadUrlResponse.json();

  // Step 2: Upload file to the provided URL
  const uploadFormData = new FormData();
  const uploadParams = uploadData.upload_params as Record<string, string>;
  Object.entries(uploadParams).forEach(([key, value]) => {
    uploadFormData.append(key, value);
  });
  // File objects can be appended directly to FormData in Node.js 18+
  uploadFormData.append("file", file);

  const uploadResponse = await fetch(uploadData.upload_url, {
    method: "POST",
    body: uploadFormData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  // Step 3: Confirm the upload by POSTing to the file location URL
  const confirmResponse = await fetch(uploadParams.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!confirmResponse.ok) {
    throw new Error(`Failed to confirm upload: ${confirmResponse.statusText}`);
  }

  const fileData = await confirmResponse.json();
  return fileData.id;
}

export async function submitTextEntry({
  classId,
  assignmentId,
  body,
  comment,
}: SubmitTextEntryParams) {
  const settings = await getCanvasSettings();
  if ("error" in settings) {
    return { error: settings.error };
  }

  try {
    const formData = new FormData();
    formData.append("submission[submission_type]", "online_text_entry");
    formData.append("submission[body]", body);
    if (comment) {
      formData.append("comment[text_comment]", comment);
    }

    const response = await fetch(
      `https://${settings.domain}/api/v1/courses/${classId}/assignments/${assignmentId}/submissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        error: error.message || `Failed to submit: ${response.statusText}`,
      };
    }

    const submission = await response.json();
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
  const settings = await getCanvasSettings();
  if ("error" in settings) {
    return { error: settings.error };
  }

  try {
    // Step 1: Upload all files
    const fileIds = await Promise.all(
      files.map((file) =>
        uploadFileToCanvas(file, classId, settings.apiKey, settings.domain),
      ),
    );

    // Step 2: Submit the assignment with file IDs
    const formData = new FormData();
    formData.append("submission[submission_type]", "online_upload");
    fileIds.forEach((fileId) => {
      formData.append("submission[file_ids][]", fileId.toString());
    });
    if (comment) {
      formData.append("comment[text_comment]", comment);
    }

    const response = await fetch(
      `https://${settings.domain}/api/v1/courses/${classId}/assignments/${assignmentId}/submissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        error: error.message || `Failed to submit: ${response.statusText}`,
      };
    }

    const submission = await response.json();
    return { success: true, submission };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to submit",
    };
  }
}

