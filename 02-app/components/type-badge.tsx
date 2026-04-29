export type TagHue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface TypeBadgeProps {
  hue: TagHue | 'neutral'
  label: string
  size?: 'xs' | 'sm'
  className?: string
}

const hueClass: Record<TagHue | 'neutral', string> = {
  1: 'bg-tag-1 text-foreground',
  2: 'bg-tag-2 text-foreground',
  3: 'bg-tag-3 text-foreground',
  4: 'bg-tag-4 text-foreground',
  5: 'bg-tag-5 text-foreground',
  6: 'bg-tag-6 text-foreground',
  7: 'bg-tag-7 text-foreground',
  8: 'bg-tag-8 text-foreground',
  neutral: 'bg-muted text-muted-foreground',
}

const sizeClass: Record<NonNullable<TypeBadgeProps['size']>, string> = {
  xs: 'text-xs px-2 py-0.5',
  sm: 'text-sm px-2.5 py-1',
}

export function TypeBadge({ hue, label, size = 'xs', className }: TypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${hueClass[hue]} ${sizeClass[size]}${className ? ` ${className}` : ''}`}
    >
      {label}
    </span>
  )
}
