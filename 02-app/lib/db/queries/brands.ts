import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema/brands'

export interface BrandChatPanePrefs {
  chatPaneOpen: boolean
  chatPaneWidth: number
}

export const PANE_WIDTH_MIN = 280
export const PANE_WIDTH_MAX = 560

/**
 * Default pane prefs used when a brand row is missing the columns or unreadable.
 * Pane defaults to closed (rail-only) so the chat content has room. The user
 * opens the panel by clicking a rail icon.
 */
export const DEFAULT_PANE_PREFS: BrandChatPanePrefs = {
  chatPaneOpen: false,
  chatPaneWidth: 360,
}

/** Read pane preferences for a brand. Returns defaults if the brand isn't found. */
export async function getBrandPanePrefs(brandId: string): Promise<BrandChatPanePrefs> {
  const rows = await db
    .select({
      chatPaneOpen: brands.chatPaneOpen,
      chatPaneWidth: brands.chatPaneWidth,
    })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1)
  return rows[0] ?? DEFAULT_PANE_PREFS
}

/** Write `chatPaneOpen` for a brand. */
export async function updateBrandChatPaneOpen(brandId: string, open: boolean): Promise<void> {
  await db
    .update(brands)
    .set({ chatPaneOpen: open, updatedAt: new Date() })
    .where(eq(brands.id, brandId))
}

/** Write `chatPaneWidth` for a brand. Caller is responsible for clamping to bounds. */
export async function updateBrandChatPaneWidth(brandId: string, width: number): Promise<void> {
  const clamped = Math.min(PANE_WIDTH_MAX, Math.max(PANE_WIDTH_MIN, Math.round(width)))
  await db
    .update(brands)
    .set({ chatPaneWidth: clamped, updatedAt: new Date() })
    .where(eq(brands.id, brandId))
}
