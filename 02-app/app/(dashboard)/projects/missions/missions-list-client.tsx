'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Compass } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { EmptyState } from '@/components/empty-state'
import { CreateMissionModal } from '@/components/create-mission-modal'
import type { MissionSummary, MissionPhase } from '@/lib/types/missions'
import { PHASE_LABELS, PHASE_COLOURS } from '@/lib/types/missions'

const PHASE_ORDER: (MissionPhase | 'all')[] = ['all', 'exploring', 'synthesising', 'producing', 'complete', 'paused']

function timeAgo(date: Date | string | null): string {
  if (!date) return '—'
  const now = Date.now()
  const then = new Date(date).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface MissionsListClientProps {
  missions: MissionSummary[]
  phaseCounts: Record<MissionPhase | 'all', number>
}

export function MissionsListClient({ missions, phaseCounts }: MissionsListClientProps) {
  const [activeFilter, setActiveFilter] = useState<MissionPhase | 'all'>('exploring')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = activeFilter === 'all'
    ? missions
    : missions.filter((m) => m.phase === activeFilter)

  if (missions.length === 0) {
    return (
      <>
        <EmptyState
          icon={Compass}
          heading="No missions yet"
          description="Start an investigation to cluster research around a question."
          action={
            <ActionButton icon={Plus} onClick={() => setCreateOpen(true)}>
              New mission
            </ActionButton>
          }
        />
        <CreateMissionModal open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {PHASE_ORDER.map((phase) => {
            const count = phaseCounts[phase]
            const isActive = activeFilter === phase
            const label = phase === 'all' ? 'All' : PHASE_LABELS[phase]
            return (
              <button
                key={phase}
                onClick={() => setActiveFilter(phase)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label} {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>
        <ActionButton icon={Plus} onClick={() => setCreateOpen(true)}>
          New mission
        </ActionButton>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {activeFilter === 'all' ? '' : PHASE_LABELS[activeFilter].toLowerCase()} missions.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Thesis</th>
              <th className="pb-2 pr-4">Phase</th>
              <th className="pb-2 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((mission) => (
              <tr key={mission.id} className="group hover:bg-muted/50 transition-colors">
                <td className="py-3 pr-4">
                  <Link
                    href={`/projects/missions/${mission.id}`}
                    className="font-medium text-sm text-foreground hover:underline"
                  >
                    {mission.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-sm text-muted-foreground max-w-[300px] truncate">
                  {mission.thesis || '—'}
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PHASE_COLOURS[mission.phase]}`}>
                    {PHASE_LABELS[mission.phase]}
                  </span>
                </td>
                <td className="py-3 text-right text-xs text-muted-foreground">
                  {timeAgo(mission.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CreateMissionModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
