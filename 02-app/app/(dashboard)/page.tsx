import Link from 'next/link'
import {
  Upload,
  ListOrdered,
  MessageSquare,
  Sparkles,
  FileText,
  Mic,
  Clock,
  Target,
  Compass,
} from 'lucide-react'
import { SectionCard } from '@/components/section-card'
import { EmptyState } from '@/components/empty-state'
import { ActionButton } from '@/components/action-button'
import { ListItem } from '@/components/list-item'
import { StatusBadge, type StatusOption } from '@/components/status-badge'
import { NewInputDropdown } from './new-input-dropdown'
// DS-07 exception: Tooltip wraps the disabled-QuickAction span (line ~425). The
// tooltip-on-disabled-element pattern is its own concern; promoting it to a molecule is
// follow-up work (potential `DisabledHint` molecule).
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getPendingInputsCount,
  getRecentPendingInputs,
  getSourceCount,
  getGraphNodeCount,
  getRecentActivity,
} from '@/lib/db/queries/dashboard'
import { getActiveMissions } from '@/lib/db/queries/missions'
import { getActiveProjectsForDashboard } from '@/lib/db/queries/client-projects'
import { FolderKanban } from 'lucide-react'

const MISSION_PHASE_OPTIONS: StatusOption[] = [
  { value: 'exploring', label: 'Exploring', hue: 1 },
  { value: 'synthesising', label: 'Synthesising', hue: 2 },
  { value: 'producing', label: 'Producing', hue: 3 },
  { value: 'complete', label: 'Complete', hue: 4 },
  { value: 'paused', label: 'Paused', hue: 5 },
]

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

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

const activityLayerIcon = {
  input: Upload,
  source: FileText,
}

const INPUT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pending', state: 'warning' },
  { value: 'committed', label: 'Committed', state: 'success' },
  { value: 'skipped', label: 'Skipped', state: 'neutral' },
]

export default async function DashboardHome() {
  const [pendingCount, recentPending, sourceCount, graphNodeCount, recentActivity, activeMissions, activeProjects] =
    await Promise.all([
      getPendingInputsCount(BRAND_ID),
      getRecentPendingInputs(BRAND_ID),
      getSourceCount(BRAND_ID),
      getGraphNodeCount(),
      getRecentActivity(BRAND_ID),
      getActiveMissions(BRAND_ID),
      getActiveProjectsForDashboard(BRAND_ID),
    ])

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-foreground">
            Welcome back, Ellie
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your second brain is keeping track.
          </p>
        </div>
        <NewInputDropdown />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard label="Knowledge Nodes" value={graphNodeCount} />
        <StatCard label="Sources" value={sourceCount} />
        <StatCard
          label="Input Queue"
          value={pendingCount}
          detail={pendingCount > 0 ? `${pendingCount} need review` : undefined}
        />
      </div>

      {/* Main grid: left column (3/5) + right column (2/5) */}
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-8">
        {/* Left column */}
        <div className="space-y-8">
          {/* Current work */}
          <SectionCard
            title="Current work"
            action={
              <ActionButton href="/projects/clients" variant="ghost">
                View all
              </ActionButton>
            }
          >
            {activeMissions.length === 0 && activeProjects.length === 0 ? (
              <EmptyState
                icon={Target}
                heading="No active projects"
                description="Create a client project or start a mission to see your current work here."
                action={
                  <div className="flex gap-2">
                    <ActionButton icon={FolderKanban} href="/projects/clients" variant="outline">
                      New project
                    </ActionButton>
                    <ActionButton icon={Compass} href="/projects/missions" variant="outline">
                      New mission
                    </ActionButton>
                  </div>
                }
              />
            ) : (
              <div className="flex flex-col">
                {/* Client projects */}
                {activeProjects.map((project) => (
                  <ListItem
                    key={`project-${project.id}`}
                    as="link"
                    href={`/projects/clients/${project.id}`}
                    leading={<FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />}
                    trailing={
                      <>
                        <StatusBadge
                          status="active"
                          options={[{ value: 'active', label: 'Active', state: 'success' }]}
                        />
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(project.updatedAt)}
                        </span>
                      </>
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {project.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                        {project.organisationName}
                      </span>
                    </div>
                  </ListItem>
                ))}
                {/* Missions */}
                {activeMissions.map((mission) => (
                  <ListItem
                    key={`mission-${mission.id}`}
                    as="link"
                    href={`/projects/missions/${mission.id}`}
                    leading={<Compass className="h-4 w-4 text-muted-foreground shrink-0" />}
                    trailing={
                      <>
                        <StatusBadge
                          status={mission.phase}
                          options={MISSION_PHASE_OPTIONS}
                        />
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(mission.updatedAt)}
                        </span>
                      </>
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {mission.name}
                      </span>
                      {mission.thesis && (
                        <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {mission.thesis}
                        </span>
                      )}
                    </div>
                  </ListItem>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-3">
            <QuickAction
              href="/inputs/process"
              icon={<Upload className="h-5 w-5" />}
              label="Process text"
            />
            <QuickAction
              href="/inputs/queue"
              icon={<ListOrdered className="h-5 w-5" />}
              label="Manage queue"
              badge={pendingCount > 0 ? pendingCount : undefined}
            />
            <QuickAction
              href="/chat"
              icon={<MessageSquare className="h-5 w-5" />}
              label="Chat"
            />
            <QuickActionDisabled
              icon={<Sparkles className="h-5 w-5" />}
              label="Create content"
              tooltip="Coming in M5"
            />
          </div>
        </div>

        {/* Right column: Spark feed */}
        <SectionCard title="Spark feed">
          <EmptyState
            icon={Sparkles}
            heading="No sparks yet"
            description="Sparks surface connections and insights across your knowledge base. They'll appear here once retrieval is live."
          />
        </SectionCard>
      </div>

      {/* Bottom grid: Input queue + Recent activity */}
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-8">
        {/* Input queue */}
        <SectionCard
          title="Input queue"
          action={
            pendingCount > 0 ? (
              <ActionButton href="/inputs/queue" variant="ghost">
                Review all
              </ActionButton>
            ) : undefined
          }
        >
          {pendingCount === 0 ? (
            <EmptyState
              icon={Mic}
              heading="No items waiting"
              description="Run /krisp-ingest to pull in new meetings."
            />
          ) : (
            <div className="flex flex-col">
              <div className="text-3xl font-bold text-foreground mb-4">{pendingCount}</div>
              <div className="flex flex-col">
                {recentPending.map((item) => (
                  <ListItem
                    key={item.id}
                    trailing={
                      <StatusBadge
                        status={item.status}
                        options={INPUT_STATUS_OPTIONS}
                      />
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.inputDate
                          ? new Date(item.inputDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                  </ListItem>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Recent activity */}
        <SectionCard title="Recent activity">
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={Clock}
              heading="No activity yet"
              description="Processed inputs and committed sources will appear here."
            />
          ) : (
            <div className="flex flex-col">
              {recentActivity.map((item) => {
                const Icon = activityLayerIcon[item.layer]
                const relativeTime = timeAgo(item.createdAt)
                return (
                  <ListItem
                    key={`${item.layer}-${item.id}`}
                    leading={
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    }
                    trailing={
                      <span className="text-xs text-muted-foreground shrink-0">{relativeTime}</span>
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm text-foreground truncate">{item.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                    </div>
                  </ListItem>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

// --- Sub-components ---

function StatCard({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-heading text-3xl font-bold text-foreground">
        {value.toLocaleString()}
      </div>
      {detail && (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  )
}


function QuickAction({
  href,
  icon,
  label,
  badge,
}: {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
        {badge !== undefined && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  )
}

function QuickActionDisabled({
  icon,
  label,
  tooltip,
}: {
  icon: React.ReactNode
  label: string
  tooltip: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span />} className="w-full">
        <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center opacity-40">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
