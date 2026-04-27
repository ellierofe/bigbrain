/**
 * Channel taxonomy — TypeScript source of truth.
 *
 * Mirrors the canonical reference doc at:
 *   04-documentation/reference/channel-taxonomy.md
 *
 * Convention: doc-first, code mirrors. Keep in sync.
 *
 * Three levels:
 *   category → channel → format (format_type + subtype, see ToV schema)
 *
 * `category` and `channel` live on dna_platforms.
 * `format_type` + `subtype` live on dna_tov_samples and dna_tov_applications.
 *
 * Validation of (category, channel) pairs is app-layer (see validateCategoryChannelPair).
 * The DB stays permissive for forward-compat.
 */

import type { TagHue } from '@/components/type-badge'

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  'owned_real_estate',
  'owned_content',
  'social',
  'paid',
  'earned',
  'in_person',
  'relationships',
  'other',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  owned_real_estate: 'Owned real estate',
  owned_content: 'Owned content',
  social: 'Social',
  paid: 'Paid',
  earned: 'Earned',
  in_person: 'In-person',
  relationships: 'Relationships',
  other: 'Other',
}

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  owned_real_estate: 'Website, sales pages, newsletter — the foundational web surface.',
  owned_content: 'Blog, podcast, YouTube — content streams you publish on your own terms.',
  social: 'LinkedIn, Instagram, X, TikTok — third-party social platforms.',
  paid: 'Ads, sponsorships — money in, attention out.',
  earned: 'Press, guest podcasts, panels — coverage on other people’s surfaces.',
  in_person: 'Hosted events, talks, workshops, networking — real-world surfaces.',
  relationships: 'Cold outreach, partnerships, referrals — people-shaped channels.',
  other: 'Use sparingly — anything that genuinely doesn’t fit the above.',
}

export const CATEGORY_HUES: Record<Category, TagHue> = {
  owned_real_estate: 6, // olive
  owned_content: 1, // dusty blue
  social: 2, // dusty lilac
  paid: 5, // terracotta
  earned: 3, // custard
  in_person: 4, // dusty lavender
  relationships: 7, // cool teal — new in DS-02
  other: 8, // dusty rose — new in DS-02
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export const CHANNELS_BY_CATEGORY = {
  owned_real_estate: ['website', 'sales_page', 'newsletter', 'other'],
  owned_content: ['blog', 'podcast', 'youtube_channel', 'online_course', 'other'],
  social: [
    'linkedin',
    'instagram',
    'x',
    'tiktok',
    'facebook_profile',
    'facebook_page',
    'facebook_group',
    'threads',
    'pinterest',
    'reddit',
    'youtube_social',
    'substack_social',
    'other',
  ],
  paid: ['google_ads', 'social_ads', 'print_ads', 'sponsorship', 'other'],
  earned: ['press_feature', 'press_interview', 'guest_podcast', 'panel_appearance', 'csr_project', 'other'],
  in_person: ['hosted_event', 'talk_or_keynote', 'workshop', 'networking', 'other'],
  relationships: ['cold_outreach', 'partnership', 'referral_scheme', 'client_referral', 'word_of_mouth', 'other'],
  other: ['other'],
} as const satisfies Record<Category, readonly string[]>

export type Channel =
  | (typeof CHANNELS_BY_CATEGORY)[Category][number]

export const CHANNEL_LABELS: Record<Channel, string> = {
  // owned_real_estate
  website: 'Website',
  sales_page: 'Sales page',
  newsletter: 'Newsletter',
  // owned_content
  blog: 'Blog',
  podcast: 'Podcast',
  youtube_channel: 'YouTube (long-form)',
  online_course: 'Online course',
  // social
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  x: 'X (Twitter)',
  tiktok: 'TikTok',
  facebook_profile: 'Facebook (personal profile)',
  facebook_page: 'Facebook (business page)',
  facebook_group: 'Facebook (group)',
  threads: 'Threads',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  youtube_social: 'YouTube (Shorts)',
  substack_social: 'Substack Notes',
  // paid
  google_ads: 'Google Ads',
  social_ads: 'Social ads',
  print_ads: 'Print ads',
  sponsorship: 'Sponsorship',
  // earned
  press_feature: 'Press feature',
  press_interview: 'Press interview',
  guest_podcast: 'Guest podcast appearance',
  panel_appearance: 'Panel appearance',
  csr_project: 'CSR project',
  // in_person
  hosted_event: 'Hosted event',
  talk_or_keynote: 'Talk / keynote',
  workshop: 'Workshop',
  networking: 'Networking',
  // relationships
  cold_outreach: 'Cold outreach',
  partnership: 'Partnership',
  referral_scheme: 'Referral scheme',
  client_referral: 'Client referral',
  word_of_mouth: 'Word of mouth',
  // shared
  other: 'Other',
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

export function validateCategoryChannelPair(category: string, channel: string): boolean {
  if (!isCategory(category)) return false
  const allowed = CHANNELS_BY_CATEGORY[category] as readonly string[]
  return allowed.includes(channel)
}

export function channelsForCategory(category: Category): readonly Channel[] {
  return CHANNELS_BY_CATEGORY[category]
}

// ---------------------------------------------------------------------------
// Field relevance per category
// ---------------------------------------------------------------------------

/**
 * Channel-shape-specific fields on dna_platforms. Used by categoryHasField()
 * to drive conditional UI rendering. Only fields that vary by category are
 * listed; fields that always apply are absent here and shown unconditionally.
 */
export type PlatformConditionalField =
  | 'contentFormats'
  | 'characterLimits'
  | 'hashtagStrategy'
  | 'subtopicIdeas'
  | 'structureAndFeatures'
  | 'contentPillarThemes'

const FIELD_HIDDEN_FOR: Record<PlatformConditionalField, readonly Category[]> = {
  contentFormats: ['relationships', 'in_person', 'earned', 'owned_real_estate'],
  characterLimits: ['relationships', 'in_person', 'earned', 'owned_real_estate', 'paid'],
  hashtagStrategy: ['owned_real_estate', 'owned_content', 'paid', 'earned', 'in_person', 'relationships', 'other'],
  subtopicIdeas: ['relationships', 'paid', 'owned_real_estate', 'other'],
  structureAndFeatures: ['relationships', 'paid', 'earned'],
  contentPillarThemes: ['relationships', 'paid', 'earned', 'in_person'],
}

export function categoryHasField(category: Category, field: PlatformConditionalField): boolean {
  return !FIELD_HIDDEN_FOR[field].includes(category)
}

/**
 * Tabs hide entirely when no fields under them apply for a row's category.
 * - "Ideas" tab covers subtopicIdeas + contentPillarThemes
 * - "Formats & Output" tab covers contentFormats + characterLimits + structureAndFeatures
 */
export function categoryHasIdeasTab(category: Category): boolean {
  return categoryHasField(category, 'subtopicIdeas') || categoryHasField(category, 'contentPillarThemes')
}

export function categoryHasFormatsTab(category: Category): boolean {
  return (
    categoryHasField(category, 'contentFormats') ||
    categoryHasField(category, 'characterLimits') ||
    categoryHasField(category, 'structureAndFeatures')
  )
}

// ---------------------------------------------------------------------------
// Per-category label tweaks (cosmetic — same column, different label string)
// ---------------------------------------------------------------------------

const CADENCE_CATEGORIES: readonly Category[] = ['relationships', 'in_person', 'earned', 'paid']

export function postingFrequencyLabel(category: Category): string {
  return CADENCE_CATEGORIES.includes(category) ? 'Cadence' : 'Posting frequency'
}

export function engagementApproachLabel(category: Category): string {
  return category === 'relationships' ? 'Follow-up approach' : 'Engagement approach'
}
