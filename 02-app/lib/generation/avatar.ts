import { generateImage } from 'ai'
import { google } from '@/lib/llm/client'
import { uploadBlob } from '@/lib/storage/blob'

/**
 * Generate an avatar image from an avatar prompt and upload it to Vercel Blob.
 * Returns the blob URL on success, null on failure.
 * Designed to run in parallel with profile generation — failures don't block.
 */
export async function generateAvatar(
  avatarPrompt: string,
  segmentId: string
): Promise<string | null> {
  try {
    const result = await generateImage({
      model: google.image('gemini-3.1-flash-image-preview'),
      prompt: avatarPrompt,
      n: 1,
      aspectRatio: '1:1',
    })

    const image = result.images[0]
    if (!image) {
      console.error('generateAvatar: no image returned')
      return null
    }

    // image.uint8Array contains the raw image data
    const blob = new Blob([new Uint8Array(image.uint8Array)], { type: 'image/png' })
    const { url } = await uploadBlob(
      `avatars/segments/${segmentId}.png`,
      blob,
      { contentType: 'image/png' }
    )

    return url
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('generateAvatar failed (non-blocking):', message)
    if (stack) console.error(stack)
    return null
  }
}
