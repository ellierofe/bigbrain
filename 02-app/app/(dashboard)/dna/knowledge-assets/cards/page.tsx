import Link from 'next/link'
import { Lightbulb, Lock, Plus } from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import { ActionButton } from '@/components/action-button'
import { listAssets, listAllAssets } from '@/lib/db/queries/knowledge-assets'
import { ASSET_KIND_LABELS } from '@/lib/types/knowledge-assets'
import type { KnowledgeAssetSummary, AssetKind } from '@/lib/types/knowledge-assets'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

const KIND_BADGE_CLASSES: Record<string, string> = {
  methodology: 'bg-primary/20 text-primary-foreground',
  framework: 'bg-primary/20 text-primary-foreground',
  process: 'bg-accent text-accent-foreground',
  tool: 'bg-secondary text-secondary-foreground',
  template: 'bg-secondary text-secondary-foreground',
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: 'bg-warning-bg text-warning-foreground',
  active: 'bg-success-bg text-success-foreground',
  archived: 'bg-muted text-muted-foreground',
}

interface PageProps {
  searchParams: Promise<{ showArchived?: string; kind?: string }>
}

export default async function KnowledgeAssetsCardsPage({ searchParams }: PageProps) {
  const { showArchived, kind } = await searchParams

  const assets = showArchived === 'true'
    ? await listAllAssets(BRAND_ID)
    : await listAssets(BRAND_ID)

  const filteredAssets = kind && kind !== 'all'
    ? assets.filter(a => a.kind === kind)
    : assets

  const kinds: (AssetKind | 'all')[] = ['all', 'methodology', 'process', 'tool']

  if (assets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Lightbulb}
          heading="No knowledge assets yet"
          description="Document your first methodology, process, or tool to get started."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <PageChrome
        title="Knowledge Assets"
        subtitle="Methodologies, frameworks, processes, tools, and templates."
        action={
          <div className="flex items-center gap-2">
            <ActionButton
              variant="outline"
              href={assets.length > 0 ? `/dna/knowledge-assets/${assets[0].id}` : '/dna/knowledge-assets'}
            >
              Detail view
            </ActionButton>
          </div>
        }
      />

      <ContentPane>
        {/* Kind filter pills */}
        <div className="flex items-center gap-2 mb-4">
          {kinds.map(k => (
            <Link
              key={k}
              href={`/dna/knowledge-assets/cards?kind=${k}${showArchived === 'true' ? '&showArchived=true' : ''}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                (kind ?? 'all') === k
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {k === 'all' ? 'All' : ASSET_KIND_LABELS[k]}
            </Link>
          ))}

          <div className="ml-auto">
            <Link
              href={`/dna/knowledge-assets/cards?${kind ? `kind=${kind}&` : ''}showArchived=${showArchived === 'true' ? 'false' : 'true'}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showArchived === 'true' ? 'Hide archived' : 'Show archived'}
            </Link>
          </div>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {filteredAssets.map(asset => (
            <Link
              key={asset.id}
              href={`/dna/knowledge-assets/${asset.id}`}
              className="group rounded-lg border border-border p-4 transition-colors hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <span className="text-sm font-display font-bold text-muted-foreground">
                    {asset.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${KIND_BADGE_CLASSES[asset.kind] ?? ''}`}>
                      {ASSET_KIND_LABELS[asset.kind]}
                    </span>
                    {asset.status !== 'active' && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASSES[asset.status] ?? ''}`}>
                        {asset.status}
                      </span>
                    )}
                    {asset.proprietary && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              {asset.summary && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                  {asset.summary}
                </p>
              )}
            </Link>
          ))}
        </div>
      </ContentPane>
    </div>
  )
}
