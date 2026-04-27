'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createProjectAction,
  createOrganisationAction,
  listOrganisationsAction,
} from '@/app/actions/client-projects'

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface OrgOption {
  id: string
  name: string
}

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const router = useRouter()

  // Form state
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [brief, setBrief] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Org picker state
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [orgSearch, setOrgSearch] = useState('')
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [showNewOrg, setShowNewOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgWebsite, setNewOrgWebsite] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)

  const orgSearchRef = useRef<HTMLInputElement>(null)

  // Load orgs when modal opens
  useEffect(() => {
    if (open) {
      listOrganisationsAction().then((res) => {
        if (res.ok) setOrgs(res.data)
      })
      // Reset form
      setOrgId(null)
      setOrgName('')
      setProjectName('')
      setBrief('')
      setErrors({})
      setShowNewOrg(false)
      setOrgDropdownOpen(false)
    }
  }, [open])

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  )

  function selectOrg(org: OrgOption) {
    setOrgId(org.id)
    setOrgName(org.name)
    setOrgSearch('')
    setOrgDropdownOpen(false)
    setErrors((prev) => ({ ...prev, organisation: '' }))
  }

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return
    setSavingOrg(true)
    const res = await createOrganisationAction({
      name: newOrgName.trim(),
      website: newOrgWebsite.trim() || undefined,
    })
    setSavingOrg(false)

    if (res.ok) {
      const newOrg = { id: res.data.id, name: res.data.name }
      setOrgs((prev) => [...prev, newOrg].sort((a, b) => a.name.localeCompare(b.name)))
      selectOrg(newOrg)
      setShowNewOrg(false)
      setNewOrgName('')
      setNewOrgWebsite('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (!orgId) newErrors.organisation = 'Select or create a client organisation.'
    if (!projectName.trim()) newErrors.name = 'Project name is required.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    const res = await createProjectAction({
      name: projectName.trim(),
      organisationId: orgId!,
      brief: brief.trim() || undefined,
    })
    setSaving(false)

    if (res.ok) {
      onOpenChange(false)
      router.push(`/projects/clients/${res.data.id}`)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New client project"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        {/* Organisation picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium">Client organisation</label>

          {orgId ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-border px-3 py-2 text-sm">
                {orgName}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setOrgId(null); setOrgName(''); setOrgDropdownOpen(true) }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                ref={orgSearchRef}
                placeholder="Search organisations..."
                value={orgSearch}
                onChange={(e) => { setOrgSearch(e.target.value); setOrgDropdownOpen(true) }}
                onFocus={() => setOrgDropdownOpen(true)}
                className="text-sm"
              />

              {orgDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-md">
                  <div className="max-h-40 overflow-y-auto p-1">
                    {filteredOrgs.length === 0 && (
                      <p className="px-3 py-2 text-[13px] text-muted-foreground">No organisations found.</p>
                    )}
                    {filteredOrgs.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => selectOrg(org)}
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border p-1">
                    <button
                      type="button"
                      onClick={() => { setShowNewOrg(true); setOrgDropdownOpen(false) }}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-[13px] font-medium text-primary transition-colors hover:bg-muted/50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create new organisation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline new org creation */}
          {showNewOrg && !orgId && (
            <div className="mt-1 rounded-md border border-dashed border-border p-3 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">Organisation name</label>
                <Input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. UKRI"
                  className="text-sm"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">Website (optional)</label>
                <Input
                  value={newOrgWebsite}
                  onChange={(e) => setNewOrgWebsite(e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleCreateOrg} disabled={!newOrgName.trim() || savingOrg}>
                  {savingOrg ? 'Saving...' : 'Save organisation'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewOrg(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {errors.organisation && (
            <p className="text-[12px] text-destructive">{errors.organisation}</p>
          )}
        </div>

        {/* Project name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium">Project name</label>
          <Input
            value={projectName}
            onChange={(e) => { setProjectName(e.target.value); setErrors((prev) => ({ ...prev, name: '' })) }}
            placeholder="e.g. Robotics Strategy 2025"
            className="text-sm"
          />
          {errors.name && (
            <p className="text-[12px] text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Brief */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium">
            Brief <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Scope, objectives, key questions..."
            className="min-h-[80px] resize-none text-sm"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
