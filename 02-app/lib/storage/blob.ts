import { put, del, list, head } from "@vercel/blob"

export type BlobUploadResult = {
  url: string
  pathname: string
  contentType: string
}

/**
 * Upload a file to Vercel Blob.
 * pathname should be a logical path, e.g. "inputs/transcripts/foo.txt"
 */
export async function uploadBlob(
  pathname: string,
  body: File | Blob | ArrayBuffer | ReadableStream,
  options?: { contentType?: string; access?: "public" }
): Promise<BlobUploadResult> {
  const result = await put(pathname, body, {
    access: options?.access ?? "public",
    contentType: options?.contentType,
  })
  return {
    url: result.url,
    pathname: result.pathname,
    contentType: result.contentType,
  }
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url)
}

export async function listBlobs(prefix?: string) {
  return list({ prefix })
}

export async function getBlobMetadata(url: string) {
  return head(url)
}
