import {
  FileAudio,
  FileText,
  Mic,
  Database,
  ClipboardList,
  StickyNote,
  BookOpen,
  Presentation,
  FileBarChart2,
  Folder,
  Lightbulb,
  File,
  type LucideIcon,
} from 'lucide-react'
import type { SourceType, Authority } from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Centralised source-type → icon + label map + default authority (per ADR-009
// brief table). Used wherever a sourceType value needs to be rendered as a
// human label or icon. Single source of truth — prevents per-surface drift.
// ---------------------------------------------------------------------------

export interface SourceTypeMeta {
  label: string
  icon: LucideIcon
  defaultAuthority: Authority
}

export const SOURCE_TYPE_META: Record<SourceType, SourceTypeMeta> = {
  'client-interview':       { label: 'Client interview',        icon: Mic,           defaultAuthority: 'external-authoritative' },
  'coaching-call':          { label: 'Coaching call',           icon: FileAudio,     defaultAuthority: 'peer' },
  'peer-conversation':      { label: 'Peer conversation',       icon: FileAudio,     defaultAuthority: 'peer' },
  'supplier-conversation':  { label: 'Supplier conversation',   icon: FileAudio,     defaultAuthority: 'peer' },
  'accountability-checkin': { label: 'Accountability check-in', icon: ClipboardList, defaultAuthority: 'peer' },
  'meeting-notes':          { label: 'Meeting notes',           icon: FileText,      defaultAuthority: 'peer' },
  'internal-notes':         { label: 'Internal notes',          icon: StickyNote,    defaultAuthority: 'own' },
  'research-document':      { label: 'Research document',       icon: BookOpen,      defaultAuthority: 'external-authoritative' },
  'dataset':                { label: 'Dataset',                 icon: Database,      defaultAuthority: 'external-sample' },
  'pitch-deck':             { label: 'Pitch deck',              icon: Presentation,  defaultAuthority: 'external-sample' },
  'report':                 { label: 'Report',                  icon: FileBarChart2, defaultAuthority: 'own' },
  'collection':             { label: 'Collection',              icon: Folder,        defaultAuthority: 'external-sample' },
  'content-idea':           { label: 'Content idea',            icon: Lightbulb,     defaultAuthority: 'own' },
}

export const AUTHORITY_LABEL: Record<Authority, string> = {
  'own':                    'Own',
  'peer':                   'Peer',
  'external-authoritative': 'External — authoritative',
  'external-sample':        'External — sample',
}

export function getSourceTypeMeta(t: SourceType): SourceTypeMeta {
  return SOURCE_TYPE_META[t] ?? { label: t, icon: File, defaultAuthority: 'own' }
}

export function getSourceTypeLabel(t: SourceType): string {
  return getSourceTypeMeta(t).label
}

export function getSourceTypeIcon(t: SourceType): LucideIcon {
  return getSourceTypeMeta(t).icon
}

export function getAuthorityLabel(a: Authority): string {
  return AUTHORITY_LABEL[a] ?? a
}

/** Select options for sourceType dropdowns. */
export function sourceTypeOptions(): { value: SourceType; label: string }[] {
  return (Object.keys(SOURCE_TYPE_META) as SourceType[]).map((t) => ({
    value: t,
    label: SOURCE_TYPE_META[t].label,
  }))
}

/** Select options for authority dropdowns. */
export function authorityOptions(): { value: Authority; label: string }[] {
  return (Object.keys(AUTHORITY_LABEL) as Authority[]).map((a) => ({
    value: a,
    label: AUTHORITY_LABEL[a],
  }))
}
