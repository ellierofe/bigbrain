'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema/brands'
import { eq } from 'drizzle-orm'
import {
  PANE_WIDTH_MAX,
  PANE_WIDTH_MIN,
  updateBrandChatPaneOpen,
  updateBrandChatPaneWidth,
} from '@/lib/db/queries/brands'

const isDev = process.env.NODE_ENV === 'development'

async function requireAuth() {
  if (isDev) return
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
}

async function getBrandId(): Promise<string> {
  const [brand] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, 'nicelyput'))
    .limit(1)
  if (!brand) throw new Error('Brand not found')
  return brand.id
}

/** Persist whether the chat context pane is open for the active brand. */
export async function setChatPaneOpenAction(open: boolean): Promise<{ ok: true }> {
  await requireAuth()
  const brandId = await getBrandId()
  await updateBrandChatPaneOpen(brandId, open)
  return { ok: true }
}

/** Persist the chat context pane width for the active brand. Clamped 280–560. */
export async function setChatPaneWidthAction(
  width: number
): Promise<{ ok: true; width: number }> {
  await requireAuth()
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    throw new Error('Invalid pane width')
  }
  const clamped = Math.min(PANE_WIDTH_MAX, Math.max(PANE_WIDTH_MIN, Math.round(width)))
  const brandId = await getBrandId()
  await updateBrandChatPaneWidth(brandId, clamped)
  return { ok: true, width: clamped }
}
