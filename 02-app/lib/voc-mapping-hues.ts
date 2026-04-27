import type { TagHue } from '@/components/type-badge'

export type VocMappingKind = 'practical' | 'emotional' | 'psychological' | 'social'

export const VOC_MAPPING_KIND_HUES: Record<VocMappingKind, TagHue> = {
  practical: 1,      // dusty blue
  emotional: 5,      // terracotta
  psychological: 4,  // dusty lavender
  social: 3,         // custard
}

export const VOC_MAPPING_KIND_LABELS: Record<VocMappingKind, string> = {
  practical: 'Practical',
  emotional: 'Emotional',
  psychological: 'Psychological',
  social: 'Social',
}
