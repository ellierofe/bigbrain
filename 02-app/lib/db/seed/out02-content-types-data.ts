/**
 * OUT-02 Phase 3 — V1 content_types + prompt_stages seed data
 *
 * Three single-step content types for V1: Instagram caption, Newsletter edition,
 * Brainstorm – Blog posts. Long-form (blog post, sales page) is deferred to
 * OUT-02a as it requires the multi-step blueprint→copy flow.
 *
 * Plus 4 new fragments authored for the eight-layer model:
 *   - persona_social_copywriter
 *   - persona_owned_content_strategist
 *   - worldview_social_engagement
 *   - worldview_owned_content
 *
 * Existing fragments (from out02-fragments-data.ts, legacy port) are referenced
 * by slug — the seeder resolves slug→id at insert time.
 */

import type { NewContentType } from '@/lib/db/schema/content/content-types'
import type { NewPromptFragment } from '@/lib/db/schema/content/prompt-fragments'

// ---------------------------------------------------------------------------
// New fragments — personas + worldviews authored for the eight-layer model
// ---------------------------------------------------------------------------

export const out02NewFragmentSeeds: NewPromptFragment[] = [
  {
    slug: 'persona_social_copywriter',
    kind: 'persona',
    name: 'Persona — Social Copywriter',
    purpose: 'Layer 1 persona for social-platform short-form content (IG, LinkedIn posts, etc.)',
    usage: 'Used by content types in the social picker group. Pairs with worldview_social_engagement.',
    content: `You are a social media copywriter who excels at helping small businesses create compelling, engaging content for social platforms. You understand that social copy lives or dies on the first sentence, that engagement is the metric that matters, and that every caption is a chance to deepen the brand's relationship with its audience.`,
    placeholders: [],
    status: 'active',
    notes: null,
  },
  {
    slug: 'persona_owned_content_strategist',
    kind: 'persona',
    name: 'Persona — Owned Content Strategist',
    purpose: 'Layer 1 persona for owned-platform content (newsletters, blogs, podcasts, video) and brainstorm types feeding those platforms',
    usage: 'Used by long-form, newsletter, and brainstorm content types. Pairs with worldview_owned_content.',
    content: `You are an experienced content marketing strategist who excels at helping small businesses create compelling and effective content for their owned content platforms. Owned content platforms — blogs, podcasts, video channels, email newsletters — offer engagement-style content where businesses provide value to their audiences while demonstrating expertise, deepening connection, and building brand equity. They also serve discovery through SEO and listings.`,
    placeholders: [],
    status: 'active',
    notes: null,
  },
  {
    slug: 'worldview_owned_content',
    kind: 'worldview',
    name: 'Worldview — Owned Content',
    purpose: 'Layer 2 principles about what owned content is for, and how it differs from paid/social content',
    usage: 'Used by newsletter, blog, podcast, and brainstorm-for-owned-content types. Pairs with persona_owned_content_strategist.',
    content: `Owned content earns attention; it does not buy or beg for it. Every piece must justify its place in the audience's inbox, feed, or reading list by giving real value — a useful insight, a perspective shift, a moment of recognition. Selling, pitching, or self-congratulation come second to genuine engagement.

The business is the messenger, not the message. Topics that serve the audience's curiosity, problems, or aspirations come first; the brand's offers come in only when they fit the story being told. A reader who finishes thinking "that was useful" is the goal — even if there's no immediate conversion.

Format-respect matters. A blog post is not a newsletter. A newsletter is not a podcast script. Each owned platform has its own conventions, attention-rhythm, and audience contract — write for the medium you're in.`,
    placeholders: [],
    status: 'active',
    notes: null,
  },
  {
    slug: 'worldview_social_engagement',
    kind: 'worldview',
    name: 'Worldview — Social Engagement',
    purpose: 'Layer 2 principles for social-platform short-form content',
    usage: 'Used by IG, LinkedIn, Twitter, etc. social-short content types. Pairs with persona_social_copywriter.',
    content: `Social posts win attention in the first three seconds or not at all. The hook is the post — everything after only matters if the hook earned the read. A weak hook with great copy beneath it is a wasted post.

Each post does one thing well. Five different posts about the same topic should each take a clearly different angle — a quick tip, an empathetic recognition, an opinionated take, an informative point — never blur the lines between angles in a single post.

Speak to one person. Social audiences scroll alone, even in a feed of millions. "You" in a caption means *you, reading this right now* — not "all of you in the marketing demographic." Internal names and persona labels never appear in the copy.

Engagement is the metric. Likes, saves, shares, replies — these are the signals that the post landed. Conversion comes later, through the brand relationship the engagement built.`,
    placeholders: [],
    status: 'active',
    notes: null,
  },
]

// ---------------------------------------------------------------------------
// Content types + their single stage
// ---------------------------------------------------------------------------

/**
 * Pairs a content_types row with its single stage_order=1 prompt_stages row.
 * Fragment references are by slug — the seeder resolves to UUIDs at insert time.
 */
export interface ContentTypeWithStage {
  contentType: NewContentType
  stage: {
    stageOrder: number
    stageKind: 'single' | 'blueprint' | 'copy' | 'synthesis'
    personaFragmentSlug: string
    worldviewFragmentSlug: string | null
    taskFraming: string
    structuralSkeleton: string
    craftFragmentConfig: { mode: 'list'; slugs: string[] } | { mode: 'tiered'; tiers: Record<string, string[]> } | Record<string, never>
    outputContractFragmentSlug: string
    outputContractExtras: string | null
    defaultModel: string | null
    minTokens: number | null
    maxTokens: number | null
    notes: string | null
  }
}

export const out02ContentTypeSeeds: ContentTypeWithStage[] = [
  // -------------------------------------------------------------------------
  // 1. Instagram caption
  // -------------------------------------------------------------------------
  {
    contentType: {
      slug: 'instagram-caption',
      name: 'Instagram caption',
      description: 'A short Instagram caption with hook, detail, and CTA. 5 variants per generation.',
      icon: 'instagram',
      pickerGroup: 'social',
      platformType: 'instagram',
      formatType: 'social_short',
      subtype: 'instagram_post',
      isMultiStep: false,
      prerequisites: { channels: ['instagram'], lead_magnets: [], dna: ['tone_of_voice', 'audience_segments', 'business_overview'] },
      defaultVariantCount: 5,
      defaultMinChars: 200,
      defaultMaxChars: 2200,
      topicBarEnabled: true,
      strategyFields: [
        { id: 'audience_segment', required: true },
        { id: 'customer_journey_stage', required: false },
      ],
      topicContextConfig: {
        dna_pulls: ['audience_summary', 'tov_frame'],
        fallback: null,
      },
      seo: false,
      customerJourneyStage: null,
      timeSavedMinutes: 30,
      status: 'active',
      notes: 'Legacy id=30. Ported from Centralised Prompt Data Live + Content Creation Live Data.',
    },
    stage: {
      stageOrder: 1,
      stageKind: 'single',
      personaFragmentSlug: 'persona_social_copywriter',
      worldviewFragmentSlug: 'worldview_social_engagement',
      taskFraming: `***TASK & GOAL***
You are going to create \${variant_count} DIFFERENT, SEPARATE Instagram captions.
The goal is to create Instagram posts that serve as effective, persuasive marketing content for a business.

Instagram captions are brief snippets that provide intriguing, engaging or otherwise persuasive and compelling content that helps a business connect with their audience while building their brand.

***TOPIC & CONTEXT***
\${topic}`,
      structuralSkeleton: `***FORMAT & STRUCTURE***

The structure of a long caption is:
Hook - Detail - CTA

HOOKS - 1 sentence
\${hooks_social}

DETAIL - 2-4 sentences
The body should engage with the audience in the context of the post topic. This is where the INTERNAL LOGIC of the post is most crucial. Use a variety of these approaches to the body of the post across the \${variant_count} versions you create.

Use bullet points, subheadings, or numbered lists to break down complex information, making it easier for the audience to digest.

DETAIL 1: A 'quick tip'. This is where you give the audience a small but useful bit of information related to your field, specialism and/or the topic of the post.
DETAIL 2: Empathy. This is where you relate to how the post topic affects, impacts or drives this audience, showing clear empathy.
DETAIL 3: Opinionated: This is where you take a general belief, myth or otherwise 'common knowledge' idea and go against it with a quick 'hot take'.
DETAIL 4: Informative: A brief, but value-driven elaboration of the post topic.

\${social_ctas}.

SPECIFIC TECHNIQUES
\${internal_logic}
\${labels}`,
      craftFragmentConfig: {
        mode: 'list',
        slugs: ['cadence', 'visual_formatting', 'empathy', 'apostrophe', 'experiential'],
      },
      outputContractFragmentSlug: 'json_five',
      outputContractExtras: `REMEMBER: You must craft \${variant_count} DIFFERENT, SEPARATE versions of the caption that are engaging and long enough to fully meet the brief.

\${no_fluff}`,
      defaultModel: null,
      minTokens: 1000,
      maxTokens: 2000,
      notes: null,
    },
  },

  // -------------------------------------------------------------------------
  // 2. Newsletter edition
  // -------------------------------------------------------------------------
  {
    contentType: {
      slug: 'newsletter-edition',
      name: 'Newsletter edition',
      description: 'A full edition of an email newsletter — based on a topic, source material, or the platform itself. 5 variants per generation.',
      icon: 'mail',
      pickerGroup: 'email',
      platformType: 'newsletter',
      formatType: 'newsletter',
      subtype: null,
      isMultiStep: false,
      prerequisites: { channels: ['newsletter'], lead_magnets: [], dna: ['tone_of_voice', 'audience_segments', 'business_overview'] },
      defaultVariantCount: 5,
      defaultMinChars: 800,
      defaultMaxChars: 3000,
      topicBarEnabled: true,
      strategyFields: [
        { id: 'audience_segment', required: true },
        { id: 'platform', required: true },
      ],
      topicContextConfig: {
        dna_pulls: ['audience_summary', 'tov_frame'],
        fallback: null,
      },
      seo: false,
      customerJourneyStage: null,
      timeSavedMinutes: 45,
      status: 'active',
      notes: 'Legacy id=100. Single-step variant: 5 newsletter editions per generation, not one full edition.',
    },
    stage: {
      stageOrder: 1,
      stageKind: 'single',
      personaFragmentSlug: 'persona_owned_content_strategist',
      worldviewFragmentSlug: 'worldview_owned_content',
      taskFraming: `***TASK & GOAL***
You are going to create \${variant_count} DIFFERENT, SEPARATE 'editions' of the newsletter for this business.

The goal is to write an effective, engaging newsletter that will bring value to the target audience while promoting the business as a subject matter expert and a source of high-value information and content.

\${topic_platform}`,
      structuralSkeleton: `***FORMAT & STRUCTURE***
Follow the key data you have about this platform in your topic & context information.

\${contentplatformstring}

Remember this is for an email so it should be highly readable and engaging in a digital format, and it must grab attention fast.

Include:
- Email subjects
- Subheadings (preview line)
- Greeting/salutation
- Enough paragraphs and text to convey meaning, value and personality - as per the platform format, structure and features.

If fitting for this platform strategy, include a CTA at the end and a PS after the sign-off.`,
      craftFragmentConfig: {
        mode: 'list',
        slugs: ['cadence', 'empathy', 'apostrophe', 'experiential'],
      },
      outputContractFragmentSlug: 'json_five',
      outputContractExtras: `REMEMBER: You must craft \${variant_count} DIFFERENT, SEPARATE editions of the newsletter.

\${no_fluff}`,
      defaultModel: null,
      minTokens: null,
      maxTokens: null,
      notes: null,
    },
  },

  // -------------------------------------------------------------------------
  // 3. Brainstorm — Blog posts
  // -------------------------------------------------------------------------
  {
    contentType: {
      slug: 'brainstorm-blog-posts',
      name: 'Brainstorm — Blog posts',
      description: 'Get 10 ideas for blog posts based on a topic, source material, or the platform strategy itself.',
      icon: 'lightbulb',
      pickerGroup: 'brainstorm',
      platformType: 'blog',
      formatType: 'brainstorm',
      subtype: null,
      isMultiStep: false,
      prerequisites: { channels: ['blog'], lead_magnets: [], dna: ['tone_of_voice', 'audience_segments'] },
      defaultVariantCount: 10,
      defaultMinChars: null,
      defaultMaxChars: null,
      topicBarEnabled: true,
      strategyFields: [
        { id: 'audience_segment', required: true },
        { id: 'platform', required: false },
      ],
      topicContextConfig: {
        dna_pulls: ['audience_summary'],
        fallback: null,
      },
      seo: false,
      customerJourneyStage: null,
      timeSavedMinutes: 45,
      status: 'active',
      notes: 'Legacy id=33. 10 ideas per run (json_ten output contract).',
    },
    stage: {
      stageOrder: 1,
      stageKind: 'single',
      personaFragmentSlug: 'persona_owned_content_strategist',
      worldviewFragmentSlug: 'worldview_owned_content',
      taskFraming: `***TASK & GOAL***
You are going to create \${variant_count} DIFFERENT, SEPARATE ideas for blog posts.

The goal is to generate a range of effective, relevant ideas for potential content that feeds into the strategy of the platform as outlined below:

***TOPIC & CONTEXT***
\${topic_platform}`,
      structuralSkeleton: `***FORMAT & STRUCTURE***

Give \${variant_count} distinct ideas for blog posts based on the topic given.

Ideas should offer a variety of approaches & angles, considering different 'routes in' to connecting with, engaging, inspiring, educating and/or persuading this target market.

Consider the goals of the content platform itself as well as the needs of the audience and include this rationale in each answer's JSON.`,
      craftFragmentConfig: {
        mode: 'list',
        slugs: ['cadence', 'empathy', 'apostrophe'],
      },
      outputContractFragmentSlug: 'json_ten',
      outputContractExtras: `REMEMBER: You must craft \${variant_count} DIFFERENT, SEPARATE ideas.

\${no_fluff}`,
      defaultModel: null,
      minTokens: 1500,
      maxTokens: 3500,
      notes: null,
    },
  },
]
