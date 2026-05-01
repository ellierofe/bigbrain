import { icons, type LucideIcon } from 'lucide-react'

/**
 * Resolves a stored icon name (kebab-case or camelCase) to a Lucide icon
 * component. Returns `null` when the name is unknown so callers can fall back
 * to a default. Used by content_types.icon and (future) content-type catalogues.
 */
export function getIconByName(name: string | null | undefined): LucideIcon | null {
  if (!name) return null

  // lucide-react exports icons under PascalCase keys (e.g. `Instagram`, `Mail`).
  // Stored values are typically kebab-case ('instagram', 'arrow-right'); also
  // accept camelCase / PascalCase / snake_case for resilience.
  const pascal = name
    .replace(/[-_\s]+/g, ' ')
    .replace(/\s+(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase())

  const Icon = (icons as Record<string, LucideIcon>)[pascal]
  return Icon ?? null
}
