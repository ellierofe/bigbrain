export type TagHue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface TypeBadgeProps {
  hue: TagHue
  label: string
  size?: 'xs' | 'sm'
  className?: string
}

const hueClass: Record<TagHue, string> = {
  1: 'bg-tag-1',
  2: 'bg-tag-2',
  3: 'bg-tag-3',
  4: 'bg-tag-4',
  5: 'bg-tag-5',
  6: 'bg-tag-6',
  7: 'bg-tag-7',
  8: 'bg-tag-8',
}

const sizeClass: Record<NonNullable<TypeBadgeProps['size']>, string> = {
  xs: 'text-xs px-2 py-0.5',
  sm: 'text-sm px-2.5 py-1',
}

export function TypeBadge({ hue, label, size = 'xs', className }: TypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-foreground ${hueClass[hue]} ${sizeClass[size]}${className ? ` ${className}` : ''}`}
    >
      {label}
    </span>
  )
}
