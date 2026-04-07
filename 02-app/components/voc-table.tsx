'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { saveVocItems } from '@/app/actions/audience-segments'
import type {
  VocProblem,
  VocDesire,
  VocObjection,
  VocBelief,
  VocCategory,
  VocType,
} from '@/lib/types/audience-segments'

type Filter = 'all' | VocType

const TYPE_LABELS: Record<VocType, string> = {
  problems: 'Problems',
  desires: 'Desires',
  objections: 'Objections',
  shared_beliefs: 'Beliefs',
}

const TYPE_MIN: Record<VocType, number> = {
  problems: 10,
  desires: 10,
  objections: 5,
  shared_beliefs: 5,
}

const TYPE_BADGE_CLASS: Record<VocType, string> = {
  problems: 'bg-blue-100 text-blue-800',
  desires: 'bg-green-100 text-green-800',
  objections: 'bg-amber-100 text-amber-800',
  shared_beliefs: 'bg-purple-100 text-purple-800',
}

const CATEGORY_OPTIONS: VocCategory[] = ['practical', 'emotional', 'psychological', 'social']

interface VocRow {
  _key: string
  type: VocType
  statement: string
  answer?: string
  category?: VocCategory
  notes?: string
}

function toRows(
  problems: VocProblem[],
  desires: VocDesire[],
  objections: VocObjection[],
  beliefs: VocBelief[]
): VocRow[] {
  return [
    ...problems.map((p, i) => ({ _key: `p-${i}`, type: 'problems' as VocType, statement: p.text, category: p.category })),
    ...desires.map((d, i) => ({ _key: `d-${i}`, type: 'desires' as VocType, statement: d.text, category: d.category })),
    ...objections.map((o, i) => ({ _key: `o-${i}`, type: 'objections' as VocType, statement: o.objection, answer: o.answer })),
    ...beliefs.map((b, i) => ({ _key: `b-${i}`, type: 'shared_beliefs' as VocType, statement: b.text, notes: b.notes })),
  ]
}

function rowsToVocArrays(rows: VocRow[]) {
  return {
    problems: rows.filter(r => r.type === 'problems').map(r => ({ text: r.statement, category: (r.category ?? 'practical') as VocCategory })) as VocProblem[],
    desires: rows.filter(r => r.type === 'desires').map(r => ({ text: r.statement, category: (r.category ?? 'practical') as VocCategory })) as VocDesire[],
    objections: rows.filter(r => r.type === 'objections').map(r => ({ objection: r.statement, answer: r.answer ?? '' })) as VocObjection[],
    shared_beliefs: rows.filter(r => r.type === 'shared_beliefs').map(r => ({ text: r.statement, notes: r.notes })) as VocBelief[],
  }
}

interface VocTableProps {
  segmentId: string
  problems: VocProblem[]
  desires: VocDesire[]
  objections: VocObjection[]
  sharedBeliefs: VocBelief[]
}

export function VocTable({ segmentId, problems, desires, objections, sharedBeliefs }: VocTableProps) {
  const [rows, setRows] = useState<VocRow[]>(() =>
    toRows(problems, desires, objections, sharedBeliefs)
  )
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const visibleRows = filter === 'all' ? rows : rows.filter(r => r.type === filter)

  const counts: Record<VocType, number> = {
    problems: rows.filter(r => r.type === 'problems').length,
    desires: rows.filter(r => r.type === 'desires').length,
    objections: rows.filter(r => r.type === 'objections').length,
    shared_beliefs: rows.filter(r => r.type === 'shared_beliefs').length,
  }

  async function persistRows(updated: VocRow[]) {
    const vocArrays = rowsToVocArrays(updated)
    const types: VocType[] = ['problems', 'desires', 'objections', 'shared_beliefs']
    const results = await Promise.all(
      types.map(t => saveVocItems(segmentId, t, vocArrays[t]))
    )
    const failed = results.find(r => !r.ok)
    if (failed) toast.error(failed.error ?? 'Save failed')
  }

  function addRow(type: VocType) {
    const key = `new-${Date.now()}`
    const newRow: VocRow = { _key: key, type, statement: '', category: 'practical' }
    const updated = [newRow, ...rows]
    setRows(updated)
    setFilter(type)
    setEditingKey(key)
  }

  function updateRow(key: string, patch: Partial<VocRow>) {
    setRows(prev => prev.map(r => r._key === key ? { ...r, ...patch } : r))
  }

  function saveRow(key: string) {
    const row = rows.find(r => r._key === key)
    if (!row || !row.statement.trim()) {
      // Remove empty rows
      const updated = rows.filter(r => r._key !== key)
      setRows(updated)
      setEditingKey(null)
      return
    }
    setEditingKey(null)
    startTransition(() => { persistRows(rows) })
  }

  function deleteSelected() {
    const prev = rows
    const updated = rows.filter(r => !selected.has(r._key))
    setRows(updated)
    setSelected(new Set())

    startTransition(async () => {
      const vocArrays = rowsToVocArrays(updated)
      const types: VocType[] = ['problems', 'desires', 'objections', 'shared_beliefs']
      const results = await Promise.all(
        types.map(t => saveVocItems(segmentId, t, vocArrays[t]))
      )
      const failed = results.find(r => !r.ok)
      if (failed) {
        // Restore
        setRows(prev)
        toast.error('Delete failed — items restored')
      }
    })
  }

  function toggleSelect(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const showObjectionAnswer = filter === 'objections'

  return (
    <div className="flex flex-col gap-3">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'problems', 'desires', 'objections', 'shared_beliefs'] as const).map(f => {
          const isType = f !== 'all'
          const count = isType ? counts[f] : undefined
          const belowMin = isType && count !== undefined && count < TYPE_MIN[f]
          const active = filter === f

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? 'All' : TYPE_LABELS[f]}
              {count !== undefined && (
                <span className={`ml-1.5 ${belowMin ? 'text-amber-500' : ''}`}>
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {selected.size > 0 ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteSelected}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected ({selected.size})
          </Button>
        ) : (
          <div />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['problems', 'desires', 'objections', 'shared_beliefs'] as VocType[]).map(t => (
              <DropdownMenuItem key={t} onClick={() => addRow(t)}>
                {TYPE_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      {visibleRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {filter === 'all' ? 'statements' : TYPE_LABELS[filter as VocType].toLowerCase()} yet — add your first one via the Add button above.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-24">Type</TableHead>
              {filter !== 'objections' && <TableHead className="w-28">Category</TableHead>}
              <TableHead>Statement</TableHead>
              {showObjectionAnswer && <TableHead>Answer</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map(row => (
              <TableRow key={row._key}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(row._key)}
                    onCheckedChange={() => toggleSelect(row._key)}
                  />
                </TableCell>
                <TableCell>
                  <Badge className={TYPE_BADGE_CLASS[row.type]}>
                    {TYPE_LABELS[row.type].replace(/s$/, '')}
                  </Badge>
                </TableCell>
                {filter !== 'objections' && (
                  <TableCell>
                    {row.type !== 'objections' && row.category ? (
                      editingKey === row._key ? (
                        <select
                          value={row.category}
                          onChange={e => updateRow(row._key, { category: e.target.value as VocCategory })}
                          className="text-xs rounded border border-border bg-background px-1 py-0.5"
                        >
                          {CATEGORY_OPTIONS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.category}</span>
                      )
                    ) : null}
                  </TableCell>
                )}
                <TableCell>
                  {editingKey === row._key ? (
                    <textarea
                      autoFocus
                      value={row.statement}
                      onChange={e => updateRow(row._key, { statement: e.target.value })}
                      onBlur={() => saveRow(row._key)}
                      onKeyDown={e => { if (e.key === 'Escape') { setEditingKey(null) } }}
                      rows={2}
                      className="w-full resize-none rounded border border-border bg-background p-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  ) : (
                    <span
                      className="cursor-pointer text-sm line-clamp-2 hover:text-foreground"
                      onClick={() => setEditingKey(row._key)}
                    >
                      {row.statement || <span className="text-muted-foreground italic">Click to add…</span>}
                    </span>
                  )}
                </TableCell>
                {showObjectionAnswer && (
                  <TableCell>
                    {editingKey === row._key ? (
                      <textarea
                        value={row.answer ?? ''}
                        onChange={e => updateRow(row._key, { answer: e.target.value })}
                        onBlur={() => saveRow(row._key)}
                        rows={2}
                        className="w-full resize-none rounded border border-border bg-background p-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span
                        className="cursor-pointer text-sm line-clamp-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingKey(row._key)}
                      >
                        {row.answer || <span className="italic">Click to add answer…</span>}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
