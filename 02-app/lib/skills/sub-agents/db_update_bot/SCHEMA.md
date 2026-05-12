## Schema

Generated from Drizzle schema + writes-lib WRITABLE_FIELDS exports.
Do not edit by hand — run `npm run gen:write-schema` to regenerate.

### dna_business_overview — Business overview (singular)

Writable fields:

- `businessModel` — string (optional)
- `businessName` — string
- `foundingYear` — number (optional)
- `fullDescription` — string (optional)
- `geographicFocus` — string (optional)
- `legalName` — string (optional)
- `notes` — string (optional)
- `ownerName` — string (optional)
- `primaryEmail` — string (optional)
- `shortDescription` — string (optional)
- `socialHandles` — json (optional)
- `specialism` — string
- `stage` — string (optional)
- `vertical` — string
- `websiteUrl` — string (optional)

Available tools for this entity:
- `update_dna_business_overview({ field, value })` — auto-creates the row on first write

### dna_brand_meaning — Brand meaning (singular)

Writable fields:

- `mission` — string (optional)
- `missionNotes` — string (optional)
- `purpose` — string (optional)
- `purposeNotes` — string (optional)
- `values` — json (optional)
- `vision` — string (optional)
- `visionNotes` — string (optional)

Available tools for this entity:
- `update_dna_brand_meaning({ field, value })` — auto-creates the row on first write

### dna_value_proposition — Value proposition (singular)

Writable fields:

- `alternativesAddressed` — json (optional)
- `coreStatement` — string (optional)
- `differentiators` — array (optional)
- `elevatorPitch` — string (optional)
- `internalNotes` — string (optional)
- `outcomeDelivered` — string (optional)
- `problemSolved` — string (optional)
- `targetCustomer` — string (optional)
- `uniqueMechanism` — string (optional)

Available tools for this entity:
- `update_dna_value_proposition({ field, value })` — auto-creates the row on first write

### dna_audience_segment — Audience segments (plural)

Writable fields:

- `demographics` — json (optional)
- `desires` — json
- `objections` — json
- `personaName` — string (optional)
- `problems` — json
- `psychographics` — json (optional)
- `roleContext` — string (optional)
- `segmentName` — string
- `sharedBeliefs` — json
- `sortOrder` — number (optional)
- `status` — string
- `summary` — string (optional)

Available tools for this entity:
- `update_dna_audience_segment({ id, field, value })`
- `create_dna_audience_segment({ payload })`
- `request_dna_audience_segment_generation({ seedInputs })` — async generation

### dna_offer — Offers (plural — update only; create is skill-shaped)

Writable fields:

- `cta` — string (optional)
- `customerJourney` — json (optional)
- `guarantee` — json (optional)
- `internalNotes` — string (optional)
- `name` — string
- `offerType` — string
- `overview` — string (optional)
- `pricing` — json (optional)
- `salesFunnelNotes` — string (optional)
- `scarcity` — string (optional)
- `status` — string
- `targetAudienceIds` — array (optional)
- `usp` — string (optional)
- `uspExplanation` — string (optional)
- `visualPrompt` — string (optional)
- `vocMapping` — json (optional)

Available tools for this entity:
- `update_dna_offer({ id, field, value })`

### dna_platform — Platforms (plural)

Writable fields:

- `analyticsGoals` — string (optional)
- `audience` — string (optional)
- `category` — string
- `channel` — string
- `characterLimits` — json (optional)
- `contentFormats` — json
- `contentPillarIds` — array (optional)
- `contentPillarThemes` — string (optional)
- `contentStrategy` — string (optional)
- `customerJourneyStage` — string (optional)
- `doNotDo` — array (optional)
- `engagementApproach` — string (optional)
- `growthFunction` — string (optional)
- `handle` — string (optional)
- `hashtagStrategy` — string (optional)
- `isActive` — boolean
- `name` — string
- `performanceSummary` — string (optional)
- `platformType` — string (optional)
- `postingFrequency` — string (optional)
- `primaryObjective` — string (optional)
- `structureAndFeatures` — json (optional)
- `subtopicIdeas` — json

Available tools for this entity:
- `update_dna_platform({ id, field, value })`
- `create_dna_platform({ payload })`

### dna_tone_of_voice — Tone of voice (singular)

Writable fields:

- `brandVocabulary` — json (optional)
- `dimensions` — json (optional)
- `emotionalResonance` — string (optional)
- `grammaticalPerson` — string
- `language` — string
- `linguisticNotes` — string (optional)
- `summary` — string (optional)

Available tools for this entity:
- `update_dna_tone_of_voice({ field, value })` — auto-creates the row on first write

### dna_knowledge_asset — Knowledge assets (plural)

Writable fields:

- `contexts` — string (optional)
- `detail` — json (optional)
- `faqs` — json
- `flow` — json
- `keyComponents` — json
- `kind` — string
- `name` — string
- `objectives` — string (optional)
- `origin` — string (optional)
- `principles` — string (optional)
- `priorKnowledge` — string (optional)
- `problemsSolved` — string (optional)
- `proprietary` — boolean
- `relatedOfferIds` — array (optional)
- `resources` — string (optional)
- `status` — string
- `summary` — string (optional)
- `targetAudienceIds` — array (optional)
- `visualPrompt` — string (optional)
- `vocMapping` — json (optional)

Available tools for this entity:
- `update_dna_knowledge_asset({ id, field, value })`
- `create_dna_knowledge_asset({ payload })`

### idea — Ideas (plural)

Writable fields:

- `contextPage` — string (optional)
- `status` — string
- `text` — string
- `type` — string

Available tools for this entity:
- `update_idea({ id, field, value })`
- `create_idea({ payload })`
