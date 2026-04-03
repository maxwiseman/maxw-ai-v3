import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * R2 path structure:
 *
 *   global/skills/{filename}                        — global skills (read-only via sync proxy)
 *   users/{userId}/skills/{filename}                — per-user skills (read/write)
 *   users/{userId}/chats/{chatId}/workspace/{path}  — per-chat workspace (read/write)
 */

export const GLOBAL_SKILLS_PREFIX = "global/skills/";

export function globalSkillKey(filename: string): string {
  return `${GLOBAL_SKILLS_PREFIX}${filename}`;
}

export function userSkillsPrefix(userId: string): string {
  return `users/${userId}/skills/`;
}

export function userSkillKey(userId: string, filename: string): string {
  return `${userSkillsPrefix(userId)}${filename}`;
}

/** Build an R2 object key for a file inside a chat's workspace. */
export function r2Key(
  userId: string,
  chatId: string,
  ...parts: string[]
): string {
  return `users/${userId}/chats/${chatId}/workspace/${parts.join("/")}`;
}

/** Build the R2 prefix for an entire chat workspace. */
export function chatWorkspacePrefix(userId: string, chatId: string): string {
  return `users/${userId}/chats/${chatId}/workspace/`;
}

/** Generate a signed URL for private R2 access (default 1 hour expiry). */
export async function getR2SignedUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

/** List objects under a prefix in R2 (paginates past the first 1000 keys). */
export async function listR2Objects(
  prefix: string,
): Promise<Array<{ key: string; size: number; lastModified?: Date }>> {
  const objects: Array<{
    key: string;
    size: number;
    lastModified?: Date;
  }> = [];
  let continuationToken: string | undefined;

  do {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of response.Contents ?? []) {
      if (obj.Key && !obj.Key.endsWith("/")) {
        objects.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified,
        });
      }
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

/** Upload a buffer to R2. */
export async function putR2Object(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
