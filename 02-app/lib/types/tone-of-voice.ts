export const TOV_FORMAT_TYPES = ['social', 'email', 'sales', 'blog', 'spoken', 'other'] as const

export type TovFormatType = (typeof TOV_FORMAT_TYPES)[number]

export const TOV_FORMAT_LABELS: Record<TovFormatType, string> = {
  social: 'Social',
  email: 'Email',
  sales: 'Sales',
  blog: 'Blog',
  spoken: 'Spoken',
  other: 'Other',
}

export const TOV_FORMAT_OPTIONS: Array<{ value: TovFormatType; label: string }> =
  TOV_FORMAT_TYPES.map((value) => ({ value, label: TOV_FORMAT_LABELS[value] }))

export const TOV_DIMENSION_KEYS = ['humour', 'reverence', 'formality', 'enthusiasm'] as const
export type TovDimensionKey = (typeof TOV_DIMENSION_KEYS)[number]

export interface TovDimensionDeltas {
  humour?: number
  reverence?: number
  formality?: number
  enthusiasm?: number
  notes?: string
}

export interface TovDimension {
  score: number
  description: string
}

export type TovDimensions = Record<TovDimensionKey, TovDimension>
