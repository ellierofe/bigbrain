import type { TagHue } from '@/components/type-badge'
import type { PlatformType } from '@/lib/types/platforms'

export const PLATFORM_TYPE_HUES: Record<PlatformType, TagHue> = {
  social: 1,         // dusty blue
  email: 4,          // dusty lavender
  owned_content: 6,  // olive
  video: 5,          // terracotta
  audio: 3,          // custard
  other: 2,          // dusty lilac
}

export const PLATFORM_TYPE_LABELS: Record<PlatformType, string> = {
  social: 'Social',
  email: 'Email',
  owned_content: 'Owned',
  video: 'Video',
  audio: 'Audio',
  other: 'Other',
}
