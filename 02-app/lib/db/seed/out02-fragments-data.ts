/**
 * OUT-02 Phase 3 — prompt_fragments seed data
 *
 * 38 fragments ported verbatim from legacy `Centralised Prompt Data Live.csv`
 * (commit 4267a77 era), re-categorised across the six kinds defined by ADR-006.
 *
 * Ports VERBATIM per the brief: legacy `${...}` placeholder names are preserved.
 * Many do NOT match the new vocabulary in `04-documentation/reference/prompt-vocabulary.md`
 * — see `04-documentation/reference/legacy-fragment-placeholder-drift.md` for the
 * Phase 2 rename punchlist before these fragments can actually assemble.
 *
 * Idempotent: re-running upserts on the natural key (slug, version=1).
 */

import type { NewPromptFragment } from '@/lib/db/schema/content/prompt-fragments'

export const out02FragmentSeeds: NewPromptFragment[] = [
  {
    slug: `aida_approach`,
    kind: `craft`,
    name: `Aida Approach`,
    purpose: null,
    usage: null,
    content: `AIDA (Attention, Interest, Desire, Action):
AIDA is a model that describes the stages a customer goes through in the purchasing process. It starts with grabbing the customer's Attention through eye-catching ads or headlines. Then, it aims to generate Interest by highlighting features and benefits. Next, it creates Desire by showing how the product solves a problem or improves the customer's life. Finally, it prompts Action, encouraging the customer to make a purchase or take the next step in the sales process.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `apostrophe`,
    kind: `craft`,
    name: `Apostrophe`,
    purpose: `prevent hackneyed 'callouts' or use of internal names for audience segments`,
    usage: `used in all copy`,
    content: `DO NOT DIRECTLY ADDRESS THIS AUDIENCE BY NAME OR ROLE. The persona information you have is a reflection of a wider audience and it's only for internal business use.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `blueprint_techniques`,
    kind: `craft`,
    name: `Blueprint Techniques`,
    purpose: `clarity regarding how the 'blueprint' section works`,
    usage: `used in all two-step content`,
    content: `CONTENT: DO NOT WRITE COPY. Instead, EXTRACT DIRECT WORDING from the source data, and include those EXACT PHRASES in the relevant sections, in the described output format.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `cadence`,
    kind: `craft`,
    name: `Cadence`,
    purpose: null,
    usage: null,
    content: `RHYTHM AND CADENCE. Try to vary sentence length and rhythms in your text to make it less predictable.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `content_angle`,
    kind: `craft`,
    name: `Content Angle`,
    purpose: `create a clear approach for any particular edition of a content platform`,
    usage: `used in all content platform-based content`,
    content: `CONTENT ANGLE: What is the emotionally compelling angle you'll use to shape and market this edition? 

An angle is not a bullet, a headline or such. An angle is an idea, or a very certain view you take to make your content irresistible to your reader.

Consider the platform goals and the audience psychology to create a suggested angle for this piece of content.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `cta_zhuzz`,
    kind: `craft`,
    name: `Cta Zhuzz`,
    purpose: `make the most of CTAs`,
    usage: `used in offer-based copy`,
    content: `CTA ZHUZZ: CTAs are an overlooked opportunity to stand out in copy. Take a moment to lean into the benefits, prequalify, eliminate objection, spark excitement. Examples: “Start Now -> Get 100 free credits”; “Buy Now -> Sleep better or your money back”; “Start Trial -> Start for free. Cancel at anytime”`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `empathy`,
    kind: `craft`,
    name: `Empathy`,
    purpose: `encourage a focus on audience needs and experience as they read copy`,
    usage: `used in briefing notes for all copy`,
    content: `EMPATHY DOUBLING. Writing copy with the deep, psychological experience of the audience in mind. This means avoiding cliches, surface-level writing and simplistic answers, and instead considering and addressing their fears, problems, desires and objections in a way that demonstrates that you understand and care about them. It should resonate deeply with them - because this service/offer has been designed to help them and offer an exchange of genuine, meaningful value`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `experiential`,
    kind: `craft`,
    name: `Experiential`,
    purpose: `grounding sales or marketing copy messages in the reality of the audience's experiences, rather than abstract concepts`,
    usage: `can be relevant to all marketing/sales copy`,
    content: `SYMPTOMATIC MESSAGING: Making a message more relatable and less abstract, by talking about symptoms or tangible manifestations of a problem or positive outcome. It can also be summarised by the story-telling mantra, ‘show don’t tell’. For example, if you write "do you have a bad marriage?" that’s abstract - and potentially more manipulative and fear-mongering. But symptomatic messaging aims to empathise with their experience, e.g. "do you argue with your partner more often than you make love?." If you write "Take your income to the next level!", that's abstract and potentially misleading. If you write "Saying 'yes' to that once-in-a-lifetime trip to Disneyland, without flinching at the cost” - that’s symptomatic. Examples of abstract concepts to avoid writing about are stress, anxiety, frustration, overwhelm, embarrassment, miscommunication, empowerment, fulfilment etc... Replace these with tangible manifestations of those concepts. We are providing carefully-tailored offers and services that are designed to *solve* problems, not just make money. It's important our audience feel seen and understood. Tangible manifestations come under three key categories (which can be combined where necessary): physical, behavioural or consequential. Physical: heart beating faster; energy coursing through your veins; that extra lightness in your step • Actions: hiding the mail so your partner doesn’t see overdue bills; getting a PB in your bench press; scrolling TikTok to avoid writing marketing content. • Consequential: getting envious stares from my high-school nemesis at the reunion; my kid hugging me and saying 'you're the best mum ever'; having extra cash to splurge on a fancy meal out.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `headlines`,
    kind: `craft`,
    name: `Headlines`,
    purpose: `give specific instructions regarding headlines in sales/marketing copy`,
    usage: `used in briefing notes for any output that involves sales/marketing headlines`,
    content: `HEADLINE CRAFTING: A headline has to capture attention immediately and resonate enough to lead people to give their attention to the rest of the copy. Great headlines answer ‘yes’ to these four questions: 1. Is the theme or benefit presented in the headline and lead likely to resonate powerfully with a significant number of your best prospects? 2. Does the headline and lead instantly seize your attention? 3. Is the headline easy to read? 4. Does the headline avoid cliches and patterns and/or create a ‘pattern disrupt’ in the reader’s mind?`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `hooks_email`,
    kind: `craft`,
    name: `Hooks Email`,
    purpose: `create emails with effective subject lines`,
    usage: `used in the briefing notes for email-based content`,
    content: `Crafting compelling email subject lines is crucial for improving open rates and engaging your audience. 

ALWAYS ensure the email headers will resonate with the target audience - and fit with the brand's tone of voice.

Here are five effective techniques to create impactful subject lines, along with examples and hooks to avoid.




Effective Subject Line Techniques
1. Intriguing Statements or Facts


Open with an interesting fact or surprising piece of information to pique curiosity.




Examples:



"Your inbox is costing you money"
"85% of people open emails based on the subject line alone"

2. Story or Anecdote Snippet


Start with a snippet of a story to create intrigue and encourage opens.




Examples:



"I tripled my sales with this one weird trick..."
"Our CEO's embarrassing mistake led to our biggest breakthrough"

3. Oblique Questions


Ask indirect questions that invite curiosity or encourage subscribers to reflect.




Examples:



"Is your marketing strategy stuck in 2010?"
"What if your next email campaign went viral?"

4. Direct Topic Questions


Ask straightforward questions about your email's content.




Examples:



"Ready to boost your email open rates?"
"Want to write subject lines that convert?"

5. Challenging Common Beliefs


Present a statement that goes against conventional wisdom to spark interest.




Examples:



"Why 'email is dead' is the biggest lie in marketing"
"The counterintuitive secret to email success"

6. Urgency or Scarcity


Create a sense of FOMO (Fear of Missing Out) by emphasizing limited time or availability.




Examples:



"Last chance: Our biggest sale ends at midnight"
"Only 50 spots left for our exclusive webinar"

7. Personalization


Use the recipient's name or other personal information to grab attention.




Examples:



"[First Name], we've got a special offer just for you"
"Based on your recent purchase, you'll love this..."

8. Curiosity Gap


Provide just enough information to pique interest, but not enough to satisfy curiosity.




Examples:



"The marketing trick your competitors don't want you to know"
"We were shocked when we saw these results..."

9. Numbers and Lists


Use numbers to provide a clear expectation of what's inside the email.




Examples:



"5 email marketing hacks that increased our ROI by 200%"
"3 subject line mistakes you're probably making (and how to fix them)"

10. Emoji Usage


Strategically use emojis to stand out in crowded inboxes (use sparingly and appropriately).




Examples:



"🚀 Boost your open rates with these tips"
"New product alert! 🎉 You'll want to see this"

Subject Line Hooks to Avoid

Direct audience address:

❌ "Hey there, email marketing gurus!"
❌ "Attention all small business owners!"


Generic calls-to-action:

❌ "Revolutionize Your Email Marketing Today!"
❌ "Take Your Subject Lines to the Next Level!"





Remember: The key to effective subject lines is to be specific, relevant, and intriguing without being clickbaity or misleading. 



That's why EVERY HEADLINE has to be resonant with the target audience, consider the brand's tone of voice and be based in reality.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `hooks_social`,
    kind: `craft`,
    name: `Hooks Social`,
    purpose: `create social posts with effective hooks`,
    usage: null,
    content: `HOOKS - 2-3 sentences

There are ten hook techniques below. Use a range of hooks, selecting the ones you feel are most relevant or appropriate to the posts you are creating. 

REMEMBER: these are just examples. DO NOT USE THE EXAMPLES DIRECTLY. Instead, refer to the concept and/or pattern of the hook type, then apply it to a hook that is relative to this post topic or business. 

# Social Media Post Hook Techniques

## Introduction
Crafting engaging hooks for social media posts is crucial for capturing audience attention and encouraging interaction. Here are ten effective techniques to create impactful hooks for your social media content, each with two examples.

## Effective Hook Techniques

### 1. Intriguing Statements or Facts
Open with an interesting fact, a bold statement, or a surprising piece of information that makes your audience want to read more.

Examples:
- "Honey never spoils. Neither should your marketing strategy."
- "12.5% of the entire world is on LinkedIn! Here's how to reach them effectively."

### 2. Start in the middle of a Story or Anecdote
Begin your post with a snippet of a story that creates intrigue and encourages followers to read on.

Examples:
- "I was halfway up the ladder with my skirt falling down when the vicar came to ask about our wedding vows. That's when I realized the importance of preparation in business..."
- "My client wanted champagne and I'd just given them vinegar. Here's how I turned that disaster into my biggest success story..."

### 3. Ask an Oblique Question
Pose an indirect question that invites followers to share their opinions or experiences, or opens a thought loop without closing it.

Examples:
- "Would you prefer larger, one-off payments or subscriptions? Your answer might reveal more about your business than you think."
- "Did you know that burnout isn't a medically recognized condition? Here's why that matters for your team's productivity."

### 4. Ask a Direct Question about the Topic
Present a straightforward question related to your post's main topic.

Examples:
- "What's your biggest social media marketing challenge? We've got solutions."
- "Are you making these common SEO mistakes? Let's find out."

### 5. Challenge Common Beliefs
Pose a statement or question that challenges commonly held beliefs or opinions, which can intrigue and prompt a response.

Examples:
- "'You can be anything you want' is the most harmful bit of advice we give our kids. Here's why."
- "Working 80-hour weeks isn't a badge of honor. It's a sign of inefficiency. Let me explain..."

### 6. Use a Shocking Statistic
Start with a surprising or counterintuitive statistic to grab attention and spark curiosity.

Examples:
- "90% of startups fail. Here's how to be in the 10% that succeed."
- "75% of users never scroll past the first page of search results. Here's how to make sure you're on it."

### 7. Create a 'Before and After' Scenario
Paint a picture of transformation to intrigue your audience and make them want to learn more.

Examples:
- "From 100 followers to 100,000 in 6 months - here's how we did it."
- "Last year, I was drowning in debt. This year, I'm financially free. The turning point? This one habit."

### 8. Pose a 'What If' Scenario
Encourage your audience to imagine a hypothetical situation related to your content.

Examples:
- "What if you could double your productivity with just 5 minutes of prep each day?"
- "What if your biggest business mistake was actually your greatest opportunity? It happened to me."

### 9. Share a Counterintuitive Tip
Offer advice that seems to go against common wisdom to pique interest.

Examples:
- "Why working less could actually make you more productive"
- "The case for raising your prices: How charging more can lead to more clients"

### 10. Use the 'Devil's Advocate' Technique
Present an argument against a popular opinion or practice in your industry to stimulate discussion.

Examples:
- "Social media might be killing your business. Here's why you should reconsider your strategy."
- "Why your perfectly optimized content isn't ranking: The hard truth about SEO in 2024"

## Hooks to Avoid

1. Direct address to the audience:
   - ❌ "Hey there business rockstars"
   - ❌ "Calling all tech startups!"

2. Generic calls-to-action:
   - ❌ "Elevate Your Brand To New Heights!"
   - ❌ "Transform Your Social Media Strategy Today!"

Remember: The key to effective hooks is to be specific, relevant, and intriguing without being clickbaity or misleading.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `internal_logic`,
    kind: `craft`,
    name: `Internal Logic`,
    purpose: `make sure any longer-form content has a cohesive whole rather than a lot of separate 'sections'`,
    usage: `used in all long-form copy`,
    content: `There must be an overarching logic throughout the content, so that the connection between each section is clear and the language and content flows neatly from one section to the next.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `metaphors`,
    kind: `craft`,
    name: `Metaphors`,
    purpose: `use figurative language in a more impactful, flowing and emotionally resonant way`,
    usage: `used in all copy`,
    content: `Metaphors, similes and other figurative language must ONLY be used in a way that enhances the emotional impact or clarity of the content.



Types of metaphor:
Literary metaphors are abstract and often involve high-concept ideas that are removed from everyday experiences. DO NOT USE LITERARY METAPHORS!
Experiential metaphors relate to our day-to-day experiences. They connect with the audience by reflecting common situations, making copy more accessible and understandable. USE THESE SPARINGLY WHERE THEY ARE MOST PERSUASIVE.
Twisted clichés are where you take what might seem like a cliché or standard idiom and add a twist to it so it stands out. They catch the reader's attention by playing with familiar phrases, making them both relatable and surprising. USE THESE ONLY FOR IMPACT / FOCUS.

Examples:
Concept: being given bad advice about your business
❌ literary: it’s like a ship sailing through the vast ocean without a compass, and being directed into stormy waters
experiential: your GPS has crashed mid-journey, leaving you to panic while it sits there repeating ‘rerouting, rerouting’.
twisted colloquialisms: you feel like a headless chicken that’s been given a compass - thanks for the help but I’m no better off!`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `pacing`,
    kind: `craft`,
    name: `Pacing`,
    purpose: null,
    usage: null,
    content: `PACING: Making a statement your audience already agrees with, so you can lead them where you want to go. It’s made up of two parts: a leading statement (the part the audience agrees with) and the led-to statement (the part that’s new). E.g. “We all know that AI is changing the game when it comes to business.” (leading statement). “But a lot of small businesses and startups are finding that learning the tools well enough to stand out can be almost as time-consuming as doing things manually.” (the led-to-statement)`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `paragraphs`,
    kind: `craft`,
    name: `Paragraphs`,
    purpose: null,
    usage: null,
    content: `VISUAL FORMATTING. Break up long paragraphs. Paragraphs should be a maximum of 3 sentences. If there are excessive paragraphs in use, break them up. If suitable, rephrase things into lists or other easy-to-parse formats. Use new lines to ensure the data can be parsed cleanly for readers`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `pas_approach`,
    kind: `craft`,
    name: `Pas Approach`,
    purpose: null,
    usage: null,
    content: `PAS (Problem-Agitate-Solve):
This framework focuses on the customer's pain points. It begins by clearly stating the Problem the customer is facing. Then, it Agitates that problem by vividly describing its negative consequences, making the customer feel the need for a solution more acutely. Finally, it presents the product or service as the perfect Solution to alleviate the problem.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `persuasive_sales`,
    kind: `craft`,
    name: `Persuasive Sales`,
    purpose: `remind the AI of the foundations of persuasive copy`,
    usage: `used in briefing notes for any output that involves sales/marketing copy`,
    content: `PERSUASIVE COPY: These are the basics of good sales and marketing copy. 
Clear, concise, jargon-free language (i.e. avoiding latinate or overly-complex words and using Anglo-Saxon words instead). Breaking writing up into headlines, short paragraphs, and/or bullets to make it read faster. Keeping the audience and their priorities in mind throughout.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `price_reframing`,
    kind: `craft`,
    name: `Price Reframing`,
    purpose: `improve the positioning and persuasiveness of pricing in content`,
    usage: `used in offer-based copy`,
    content: `PRICE REFRAMING: Change how people perceive the price of your product or service. E.g. you can reframe a $12/m workout platform as “For less than a monthly gym membership, get access to hundreds of on demand workouts for anywhere”. For a $300 SaaS lifetime deal you could reframe it as “For less than one month of a dedicated social media manager, get a platform that can do that and more for you - for life!”. For a 1-1 career coaching program you could reframe the price as “$10k now turns into higher earning potential for each and every year of your career from now on”.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `sales_page_angle`,
    kind: `craft`,
    name: `Sales Page Angle`,
    purpose: `create a clear angle for a sales page that can inform choices throughout`,
    usage: `used in all sales copy`,
    content: `SALES PAGE ANGLE: An angle is the emotionally compelling way in which you choose to present a piece of information.

An angle is not a bullet, a headline or specific text. It is an idea, or a very certain view you take to make your writing irresistible to your reader.

Review the offer benefits, features and usp/mechanism to find the most potent, unique angle for this sales page. It will falls into one of the following four categories. 

1. New/Unique
2. Easy/Everyone
3. Safe/Predictable
4. Big/Fast

This is the angle for your sales page.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `social_ctas`,
    kind: `craft`,
    name: `Social Ctas`,
    purpose: `give hints and tips on writing CTAs on social media`,
    usage: `used in social content creation - where the CTA isn't explicitly sales based`,
    content: `CTAs - 1-2 closing sentences that encourage action or interaction from the reader.

CTAs - 1-2 sentences

There are 10 CTA categories below. These give a range of ways to close off social posts. 

Below this, are ideas for which types are most appropriate for which points in the customer journey along with examples.

Consider which stage of the customer journey we’re working on and the kinds of CTA that go with that stage.

Then select a CTA that fits best with each post you create - and craft it into the brand’s voice, while making it feel like a natural follow on from the topic itself.

CTA Categories
1. Community 
Community building CTAs invite potential clients to join discussions, share in experiences, or participate in group activities related to your area of expertise.
Goal: Encourage audience participation and foster a sense of belonging in your audience.

2. Learning
These CTAs prompt users to access your expert content or participate in learning experiences you provide.
Goal: They encourage greater engagement from users, while positioning you as a helpful expert.

3. Speak with us
These CTAs encourage one-on-one interactions or personalized consultations with you or your team.
Goal: Bring people into a sales funnel / onto the next stage of a sales funnel via a direct call. 

4. User-Generated Content
These CTAs inspire users to showcase their experiences, thoughts, feelings, humour, creations, achievements etc related to your services.
Goal: Generate engagement, build connection and dialogue and create useful points of feedback, community and social proof at every stage of the customer journey

5. Freebies / Trials
These CTAs offer users a chance to access lead magnets, demos or sneak previews of your services, products or methodology before making a full commitment.
Goal: Reduce perceived risk while gaining buying signals (email sign ups, small purchases) - and deepening a prospect’s engagement with your work by and letting them experience your expertise/solution/product firsthand.

6. Direct Booking/Purchase
These CTAs are straightforward invitations to book a session, enroll in a course, or purchase your services.
Goal: Convert users from prospects to buyers.

7. Feedback and Improvement
These CTAs ask users to provide input that can help improve your services or overall client experience.
Goal: Market research to improve your offerings, while giving customers a voice.

8. Social Proof
Description: These CTAs encourage satisfied clients to share their positive experiences and results with others.
Goal: Leverage existing client satisfaction to attract and convince others.

9. Loyalty and Referrals
These CTAs offer special benefits or recognition for loyal clients and those who refer new business.
Goal: Incentivize continued engagement and client referrals.

10. Thought Leadership
These CTAs link your expertise to wider industry trends, challenges, or innovations.
Goal: Position yourself as an authority in your field and engage in broader industry discussions.


The examples below give you some indications of how you might vary CTAs based on the target platform, the type of content being created, the stage in the customer journey. We’ve also given examples in different brand voices to show how varied they can be.

Awareness Stage
Appropriate categories: Community, Learning, User-Generated Content, Thought Leadership
Examples:

LinkedIn: "How is AI reshaping your industry? Tell me how I’m wrong in the comments and let’s predict the future together. #AITrends"
Facebook: “What one habit do you think you’ll never be able to build? Tell me in the comments and I’ll find out what’s blocking you with just one question!”
Instagram: "Double tap if you're ready to transform your business and you don’t care who knows it! Then head to our bio to join our free Business Vision community 💭✨"

Consideration Stage
Appropriate categories: Learning, Speak with us, Freebies / Trials
Examples:

Twitter: "👀 Spotted: marketing hacks that hacks hate! Curious? Drop a 🙋‍♂️ below for our free 'Marketing Mastery' cheat sheet!"
Facebook: "GIFs only now. How do you feel when you share your website URL?” 
YouTube: "If this two-minute video saved you time you'll love our in-depth course! Use code YTFAMILY for a 7-day free trial. Tell us in the comments that you’d like to see next."

Conversion Stage
Appropriate categories: Freebies / Trials, Direct Booking/Purchase, Speak with us
Examples:

Facebook: "Ready to skyrocket your productivity? 🚀 Click the link in the first comment to secure your spot in our 'Efficiency Accelerator' program now! Only 5 seats left. You don’t wanna miss this when your peak performance is just around the corner!”
LinkedIn: "The 'Scale Your Service' mentorship is only open to new clients for 24 hours. DM me and I’ll send the purchase link. (This one’s so exclusive there isn’t even a sales page yet!)”
Instagram Story: "Swipe up to book your 1:1 strategy session! Let's turn those business dreams into reality. Poll: Does your biz need a glow-up?"

Delight Stage
Appropriate categories: Community, User-Generated Content, Feedback and Improvement
Examples:

Facebook Group post: "You've crushed it this quarter! 🏆 Share your biggest win in the comments and we’ll give you all the love and celebration you deserve. And remember! Your success story could be someone else's motivation."
Twitter: "ATTENTION ALUMNI: The Creator Showcase is about to open. Show off the best logo you’ve created since taking the course and tell us how what you learned helped you get there. Winner will get $1000 and a free business growth call with Sergio! Use #SergioLogo to be in with a shout."
LinkedIn: "Moogul massive! What's one feature you'd love to see next? Submit your idea and make Moogul work even harder for you!"

Advocacy Stage
Appropriate categories: Social Proof, Loyalty and Referrals, Thought Leadership
Examples:

LinkedIn: "Attention network! We're seeking thought leaders for our upcoming 'Future of Work' podcast series. Have you transformed your business with the Star Builder Roadmap? Comment '🎙️' if you'd like to share your insights!"
Facebook Group post: "Your success is our success! Record a 60-second video testimonial about your experience with us, and we'll give you and a friend 50% off our upcoming 'Business Accelerator' workshop. Who in your network needs a business boost?"
Twitter: "🚨 Big news, #ComradFam! 🚨 We're launching a referral program! Know someone who'd love Comrad? Create your unique referral link (follow the link in bio) and you BOTH get a month free when they sign up! Who's the first entrepreneur you'll help level up?"

Remember: These CTAs should be tailored to match the specific business data, audience segments, and content topics provided elsewhere in the prompt. The AI should adapt the tone, platform-specific elements, and specific offers based on the full context of the user's business and content strategy.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `social_narratives`,
    kind: `craft`,
    name: `Social Narratives`,
    purpose: null,
    usage: null,
    content: `Linear Narrative: This straightforward approach tells the story in a chronological order, from beginning to end. It's intuitive and easy for the audience to follow. Start with the hook, introduce the characters or key elements, present the challenge or main event, and conclude with the resolution and a call to action. This structure works well for stories with a clear, impactful journey or transformation.

AIDA (Attention, Interest, Desire, Action): AIDA is a classic marketing framework that can structure your mini-story to guide the audience through a journey that captures their attention, builds interest and desire for your product/service, and prompts action. Start with a hook to grab attention, provide interesting details to keep them engaged, create a desire by highlighting the benefits or emotional impact of your offering, and conclude with a clear call to action.

The "Before-After-Bridge" (BAB): Start by painting a picture of the 'before' scenario, illustrating the problem, pain point, or situation before your product/service came into the picture. Then, showcase the 'after'—how much better things are with your solution. Use the 'bridge' to connect these two points, explaining how your product/service makes this transformation possible. This structure is great for demonstrating value and impact.

The "Problem-Agitate-Solution" (PAS): Begin by identifying a problem relevant to your target audience. Then, 'agitate' by delving into the problem's implications, making it more relatable and urgent. Finally, present your product/service as the solution that addresses this problem. This structure is particularly effective for products or services that solve specific issues, as it builds an emotional connection and then offers relief.

Story Loop: Start with an open loop to pique curiosity, then weave a narrative that introduces characters, settings, or scenarios that are somehow linked to the loop. As the story unfolds, sprinkle in details about how your product/service is intertwined with the narrative. Conclude by closing the loop, resolving the narrative in a satisfying way that highlights the value or unique selling proposition of your offering. This method keeps readers engaged and makes your message memorable.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `storytelling_hooks`,
    kind: `craft`,
    name: `Storytelling Hooks`,
    purpose: `create social stories with effective hooks`,
    usage: null,
    content: `HOOKS - 2-3 sentences




There are ten hook techniques below for storytelling. Use a range of hook techniques in the options you create, considering which ones are most suitable for the story being told. 

REMEMBER: these are just examples. DO NOT USE THE EXAMPLES DIRECTLY. Instead, refer to the concept and/or pattern of the hook type, then apply it to a hook that is relative to this post topic or business.


# Storytelling Hook Techniques for Marketing

## Introduction
Crafting engaging hooks for storytelling in marketing is crucial for capturing audience attention and encouraging emotional connection with your brand. Here are ten effective techniques to create impactful hooks for your marketing stories, each with two examples.

## Effective Hook Techniques

### 1. Start 'In Medias Res'
Begin right in the middle of the action, immediately engaging the audience by dropping them into a pivotal moment of an unfolding event related to your product/service.

Examples:
- "The prototype burst into flames, and in that moment, I knew we'd stumbled upon something revolutionary."
- "As the last investor walked out of the room, leaving us with zero funding, my co-founder turned to me and said, 'Now the real work begins.'"

### 2. Use Related Facts or Quotes
Open with a fact or quote from the 'supporting details' of your story that sets the stage or provides context.

Examples:
- "Did you know that 68% of customers leave because they believe you don't care about them? That statistic changed everything for us."
- "'Innovation is seeing what everybody has seen and thinking what nobody has thought.' This Albert Szent-Györgyi quote was pinned above my desk the day we invented our game-changing product."

### 3. Open a Loop
Present an intriguing situation, question, or problem that grabs your specific audience's attention about your topic - but don't provide the resolution immediately.

Examples:
- "What if I told you that the biggest obstacle to your success isn't your competition, but something you do every single day without realizing it?"
- "There's a simple reason why most marketing campaigns fail, and it's not what you think. In fact, you're probably making this mistake right now."

### 4. Start with a Quote
Use a compelling or insightful quote that ties into your story's theme or message.

Examples:
- "'The best way to predict the future is to invent it.' But how do you know if you're inventing the future or stuck in your own fantasy? Where does belief become delusion?"
- "'In the middle of difficulty lies opportunity.' Einstein's words never rang truer than the day our biggest client dropped us."

### 5. Challenge Common Beliefs
Pose a statement or a question that challenges commonly held beliefs or opinions, which can intrigue and prompt a response.

Examples:
- "'You can be anything you want' is the most harmful bit of advice we give our kids. Here's why."
- "Contrary to popular belief, customer satisfaction isn't the key to business growth. In fact, it might be holding you back."

### 6. Use a Shocking Statistic
Start with a surprising or counterintuitive statistic to grab attention and spark curiosity.

Examples:
- "95% of new products fail. We were determined to be in the 5% that succeed, and here's how we did it."
- "Studies show that 88% of New Year's resolutions fail. But what if I told you that your marketing strategy is failing for the exact same reasons?"

### 7. Create a 'What If' Scenario
Encourage your audience to imagine a hypothetical situation related to your story.

Examples:
- "What if you could predict customer behavior with 99% accuracy? It sounds like science fiction, but it's exactly what our journey led us to create."
- "Imagine a world where every marketing dollar you spend brings a guaranteed return. That world is closer than you think, and here's why."

### 8. Use Contrast or Paradox
Present two seemingly contradictory ideas to create intrigue and draw the reader in.

Examples:
- "Our biggest failure led to our greatest success. Here's the counterintuitive lesson we learned."
- "We built a million-dollar business by giving away our product for free. Sounds impossible? Let me explain."

### 9. Start with a Mystery
Begin your story with an unexplained situation that promises to be solved.

Examples:
- "For months, our customers were leaving in droves, but our satisfaction scores were higher than ever. The reason behind this paradox changed our entire business model."
- "Every Friday at 3:15 PM, our website traffic spiked by 500%. When we finally figured out why, it revolutionized our marketing strategy."

### 10. Use a Bold Claim
Make a strong, attention-grabbing statement that you'll back up in your story.

Examples:
- "We doubled our revenue by firing our biggest client. And we'd do it again in a heartbeat."
- "I built a 7-figure business without spending a single dollar on advertising. Here's the unconventional approach that made it possible."

## Hooks to Avoid

1. Direct address to the audience:
   - ❌ "Hey there business rockstars"
   - ❌ "Calling all tech startups!"

2. Generic calls-to-action:
   - ❌ "Elevate Your Brand To New Heights!"
   - ❌ "Transform Your Marketing Strategy Today!"

Remember: The key to effective storytelling hooks is to be specific, relevant, and intriguing without being clickbaity or misleading.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `subheadings`,
    kind: `craft`,
    name: `Subheadings`,
    purpose: `give specific instructions regarding subheadings in sales/marketing copy`,
    usage: `used in briefing notes for any output that involves sales/marketing subheadings`,
    content: `LEAD WRITING: Leads (or subheadings) need to build on the headline to increase the prospects likelihood of investing time in reading the page. A good lead will allow you to answer ‘yes’ to these questions: 1**. Does it present compelling benefits the prospect will derive in return for reading this? 2. Does it explain why it is crucial for the prospect to read this right now?**`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `triple_stack_bullets`,
    kind: `craft`,
    name: `Triple Stack Bullets`,
    purpose: `create a framework for highlighting the features, advantages, benefits of any offer`,
    usage: `used in briefing notes for any output that involves sales/marketing lists`,
    content: `TRIPLE-STACK BULLETS: Regular bullets are simple and straight-forward. For example, a ‘benefit’ bullet might be “Increase the perceived value of your products and services”. A triple stack bullet summarizes the benefit, the feature and the mechanism/USP - to remove objections and increase persuasion. The structure of a triple stack bullet is as follows: 1) Desire/problem statement/question 2) turned into benefit or outcome, 3) via mechanism/USP/feature. Here are a few examples to guide you. Notice the three thoughts in there that support each other and make each other stronger, making them complete. Example 1: Don’t know what market to enter and sell to? Discover how to identify a highly profitable group of customers whose needs are not being met – and how to know exactly what those customers are willing to buy (before you ever sell anything to them)… Example 2: Turn competitor-fear upside down! Instead learn how to sell to their customers and clients, by leveraging the awareness they’re building in your market… Example 3: Stop worrying about your ‘100lb gorilla’ competitor. Instead, beat them at their own game by using the power of Fame Economics (this works regardless of market or size of competition – in fact, the bigger the competitor is – the better this works...)`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `brand_context`,
    kind: `context`,
    name: `Brand Context`,
    purpose: `Snippet used in long briefings to highlight tone of voice context that will be appended later`,
    usage: `used in the ‘background’ prompt`,
    content: `***BRAND CONTEXT***: At the end of this message, you will be given:
- the brand's tone of voice
- a sample of the brand's writing
- a list of banned words, which mustn't be used in any copy`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `brand_proof`,
    kind: `context`,
    name: `Brand Proof`,
    purpose: `add related stats or testimonials retrieved via vector search for potential use in content`,
    usage: `used in /first prompt gen. The variable name for vector search results in the endpoint MUST be 'related_proof'`,
    content: `We have retrieved the following stats/testimonials that may be useful for this content. NOTE: This has been retrieved via vector search so if it doesn't add value to the content or topic then please disregard this data.

\${related_proof}`,
    placeholders: ["related_proof"],
    status: `active`,
    notes: null,
  },
  {
    slug: `business_context_short`,
    kind: `context`,
    name: `Business Context Short`,
    purpose: `to give key contextual information about the specific brand we’re creating content for.`,
    usage: `added into the ‘background’ prompt`,
    content: `***BUSINESS CONTEXT***
The business is called \${brandname}. \${brandname} is in the \${business_field} and specialises in \${business_specialism}. This content is for an audience of \${audienceoverview}. 
The brand’s value proposition is \${valuepropositionstring}. (NB: If the value proposition is empty, try to gather this from context).`,
    placeholders: ["audienceoverview", "brandname", "business_field", "business_specialism", "valuepropositionstring"],
    status: `active`,
    notes: null,
  },
  {
    slug: `dna_tov`,
    kind: `context`,
    name: `Dna Tov`,
    purpose: `create standardised tone of voice instructions for DNA strategy generation`,
    usage: `used in all user_messages for dna generation`,
    content: `***Here is some guidance on tone of voice. Be sure to use the 'language' for spelling, punctuation and grammar. ***

\${tov_guideline}.

And a sample of the brand's copy:
\${selected_tov}

Use \${brand_language} for all spelling, punctuation and grammar, and use \${person} for any copy written from the brand's point of view.`,
    placeholders: ["brand_language", "person", "selected_tov", "tov_guideline"],
    status: `archived`,
    notes: `Legacy DNA-generation fragment, archived for trace; not used by OUT-02.`,
  },
  {
    slug: `topic`,
    kind: `context`,
    name: `Topic`,
    purpose: `to give key context on a topic for a specific piece of content.`,
    usage: `used in the briefing notes for topic-based content`,
    content: `***TOPIC / STRATEGY***:

The specific topic for the posts is \${post_topic}.

The target audience is \${audiencepromptstring}.

They are at this stage of their customer journey: \${customer_journey}`,
    placeholders: ["audiencepromptstring", "customer_journey", "post_topic"],
    version: 1,
    status: `archived`,
    notes: `Superseded by v2 — placeholders renamed to match prompt-vocabulary.md.`,
  },
  {
    slug: `topic`,
    kind: `context`,
    name: `Topic`,
    purpose: `to give key context on a topic for a specific piece of content.`,
    usage: `used in the briefing notes for topic-based content`,
    content: `***TOPIC / STRATEGY***:

The specific topic for the posts is \${selected}.

The target audience is \${segment_name}.

They are at this stage of their customer journey: \${customer_journey_stage}`,
    placeholders: ["selected", "segment_name", "customer_journey_stage"],
    version: 2,
    status: `active`,
    notes: null,
  },
  {
    slug: `topic_cta`,
    kind: `context`,
    name: `Topic Cta`,
    purpose: `to give key context on the offer that's the topic for a specific CTA-based piece of content.`,
    usage: `used in the briefing notes when creating CTA content`,
    content: `***TOPIC / STRATEGY***:

The offer that is being promoted is: 
\${offerpromptstring}

The business owner would like to approach the sales-based post via this angle:  \${post_topic}. 

The target audience is \${audiencepromptstring}. 

They are at this stage of their customer journey: \${customer_journey}`,
    placeholders: ["audiencepromptstring", "customer_journey", "offerpromptstring", "post_topic"],
    status: `active`,
    notes: null,
  },
  {
    slug: `topic_platform`,
    kind: `context`,
    name: `Topic Platform`,
    purpose: `to give key context on a content platform (e.g. strategy, structure, features, themes etc) as well as the topic for a specific piece of content.`,
    usage: `used in the briefing notes when creating content for podcasts, blogs, email newsletters and video platforms (e.g. YouTube)`,
    content: `***TOPIC / STRATEGY***:

The platform strategy is: \${contentplatformstring}

The specific topic to consider is \${post_topic}.

The target audience is \${audiencepromptstring}.`,
    placeholders: ["audiencepromptstring", "contentplatformstring", "post_topic"],
    version: 1,
    status: `archived`,
    notes: `Superseded by v2 — placeholders renamed to match prompt-vocabulary.md.`,
  },
  {
    slug: `topic_platform`,
    kind: `context`,
    name: `Topic Platform`,
    purpose: `to give key context on a content platform (e.g. strategy, structure, features, themes etc) as well as the topic for a specific piece of content.`,
    usage: `used in the briefing notes when creating content for podcasts, blogs, email newsletters and video platforms (e.g. YouTube)`,
    content: `***TOPIC / STRATEGY***:

The platform strategy is: \${platform_name}

The specific topic to consider is \${selected}.

The target audience is \${segment_name}.`,
    placeholders: ["platform_name", "selected", "segment_name"],
    version: 2,
    status: `active`,
    notes: null,
  },
  {
    slug: `tov_frame`,
    kind: `context`,
    name: `Tov Frame`,
    purpose: `to give the tone of voice guidelines, language and ‘person’ (e.g. we/I) for the brand.`,
    usage: `used at the end of the system message to help the AI write in the brand’s tone of voice`,
    content: `***SUPPORTING INFO***
All copy must be written in \${brand_language} and use \${person}. This is the brand's tone of voice guideline: 
\${tov_guideline}.`,
    placeholders: ["brand_language", "person", "tov_guideline"],
    status: `active`,
    notes: null,
  },
  {
    slug: `banned_words`,
    kind: `proofing`,
    name: `Banned Words`,
    purpose: null,
    usage: null,
    content: `If the brand has specific vocabulary it will be listed below. 

Brand vocabulary specifies specific language preferences. Adhere to this list wherever suitable within the context of the copy.

\${brand_vocab}. 

In addition to any specific vocabulary, this is the BANNED WORDS list FOR ALL COPY. These words must not be used unless they are the absolute best option for the context. 

Transform
Transformation
Transformative
Empower
Embark
Ensure
Mastery
"Calling all"
Empowerment
Overwhelming
Innovative
Disruptive
Honest
Honestly
Overwhelm
Orchestrate
Unleash
Unlock
Elevate
Streamline
Empower
Amplify
Supercharge
"Level Up"
Innovative
Superpower
"Treasure trove"
Revolutionary
Game-changer
"Wave goodbye"
"Best-kept secret"
Breakthrough
Unique
"Dive into"
Delve
"Hey there"
Folks
🚀
"Picture this"
biz
"I'm like that friend"
"Say goodbye to"
"Say hello to"
Nestled
Discover
Symphony
"In today's digital landscape"
Navigate
"We see you"
"Imagine"`,
    placeholders: ["brand_vocab"],
    status: `active`,
    notes: null,
  },
  {
    slug: `labels`,
    kind: `proofing`,
    name: `Labels`,
    purpose: null,
    usage: null,
    content: `NB: Use this structure and these techniques as you write, but DO NOT INCLUDE them as labels in the final output. Just return the caption ready to post directly.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `no_fluff`,
    kind: `proofing`,
    name: `No Fluff`,
    purpose: null,
    usage: null,
    content: `Do not include any preface text, explanation, information, or other extraneous text in any content itself. Do not preface your response in any way. Just return the output directly, as instructed.`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `visual_formatting`,
    kind: `proofing`,
    name: `Visual Formatting`,
    purpose: null,
    usage: null,
    content: `Use bullet points, short paragraphs and - sparingly - emojis in the content to break up the text and make it easier to read. DO NOT USE THE ROCKET EMOJI!`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `json_five`,
    kind: `output_contract`,
    name: `Json Five`,
    purpose: null,
    usage: null,
    content: `ENSURE THAT ALL 5 SEPARATE OPTIONS ARE OUTPUT IN VALID JSON as instructed below

Each option must include: 
- the title
- the content for that option
- the marketing argument/angle and an explanation of how it is tailored to the audience. DO NOT REPLICATE ANYTHING FROM YOUR SYSTEM MESSAGE OR THE USER MESSAGE WHEN DOING THIS!`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
  {
    slug: `json_ten`,
    kind: `output_contract`,
    name: `Json Ten`,
    purpose: null,
    usage: null,
    content: `ENSURE THAT ALL 10 SEPARATE OPTIONS ARE OUTPUT IN VALID JSON as instructed below

Each option must include: 
- the title
- the content for that option
- the marketing argument/angle and an explanation of how it is tailored to the audience. DO NOT REPLICATE ANYTHING FROM YOUR SYSTEM MESSAGE OR THE USER MESSAGE WHEN DOING THIS!`,
    placeholders: [],
    status: `active`,
    notes: null,
  },
]
