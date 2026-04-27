/**
 * DNA-09: Seed writing samples into dna_tov_samples
 * Source files: 04-documentation/reference/tov-samples/blogging.txt, social-media.txt
 * Uses MERGE-style check — safe to rerun (skips if samples already exist for this brand).
 */

import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

// Load env
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) process.env[match[1]] = match[2].trim()
}

const sql = neon(process.env.DATABASE_URL)

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

// --- Blog samples (split from blogging.txt) ---

const blogSamples = [
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `Speed is something of a dichotomy in test cricket. Critics point out that the game includes lunch and tea breaks, lasts five days and can still end in a draw. Fans point out that the game includes lunch and tea breaks, lasts five days and can still end in a draw. You either get it or you don't. I hated it for years, its sole place in my life being the thing that tied up the TV every weekend while my Dad watched from morning 'til night.
Then, in 2003 I was in Australia and sick. Stuck in the bedroom of our shared house, I was held hostage to the game as my ex-fiancé watched an Australia/India test. Perhaps it's sporting Stockholm Syndrome, but I've loved it ever since. And as I couldn't support Australia, I have loved Rahul Dravid since too.
I don't pretend to know a huge amount about it. This is, in part, because its bloody complicated. There are ten methods of getting out, alone. There is an intricate (and perhaps flawed) formula for calculating run targets if rain has stopped play. And there are stats.
Cricket fans love stats. They can be analysed endlessly, deployed to end arguments or just held up as a mark of a cricketer's greatness.
For example, the TP question above doesn't specify what form of cricket they're talking about. Within minutes I could find out whether Botham scored a century in the 1985 test season (he didn't), what first-class match he scored this century in, and full details of the fastest centuries in all forms of the game.
The above century was reached in 49 minutes, as part of a total score of 138, which took Botham just 67 minutes and 65 balls to achieve. It's pretty quick, although difficult to compare to the international forms where bowling, as you'd expect, is tougher and more consistent (if we ignore England's recent performance in Australia) and there is potentially more pressure.
However, he hit a four off 13 of those deliveries faced, and a six off 12 of them. That means that for all but 14 of those 'runs', Botham didn't have to run. It also means that there were about 30 deliveries that he scored nothing from. Almost half. Remember, this is the fastest century of the English cricket season in 1985 - and it's only been beaten twice in test cricket - and around 60% of the balls bowled were met with a man hitting, or not hitting, the ball and then staying pretty much still.
It may seem a quiet, uneventful game, but when you start to zoom in on what is actually happening each time a ball is bowled, it's like those microscopic images that reveal that each of our eyelashes contains tons of life.`,
    notes: 'Takes a niche topic and makes it fascinating through zooming in on specific data. Uses parenthetical asides, dry wit, and precise stats to build an argument. Personal anecdote opens, then shifts to analytical mode without losing conversational register.',
  },
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `This question is a surprisingly common example of the game getting things completely wrong. Owls are split into two groups: barn owls and true owls, and screech owls are in the latter category. In fairness, 'sometimes referred to' could imply 'by people who are wrong' so there is some wriggle room here. Regardless of the factual inaccuracy, owls are incredible creatures, so let's chat about them a bit.
I don't know which one of us looks more unsure in this photo. In fairness, my concern could be the bowl haircut. Or the brown and yellow uniform (it was a Catholic school and I think they were making us atone for the sins of humanity) but I think it's more likely the raptor on my shoulder. Oh sure, you might say it's 'just an owl', but you haven't just watched that beak tearing through raw flesh like it was a peach. Nor do you have to worry about it shitting on your shoulder.
I have an awful memory for my childhood. I can only assume this is because I am an alien, put on the earth to destroy you all once my chip is activated. But one memory my masters have planted particularly vividly is this owl coming to our school and flying over us kids without making a drop of noise. I should point out it had a handler - it wasn't just the Littlest Hobo of the owl world.
Most prey animals have developed pretty good hearing - all the better to avoid being eaten with. In turn, owls have evolved to be silent, but deadly. Yes. Like farts. Perhaps that's not the best description. Let's say they are 'whispering death' instead.`,
    notes: 'Childhood anecdote blended with factual content. Self-deprecating humour that never feels performative. Mixes registers freely — scientific fact next to "shitting on your shoulder". The absurdist asides (alien chip, farts) feel natural rather than forced.',
  },
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `The English language is a wonderful thing. Some moan about its imprecision or lack of strict rules, but that's what gives it such room for expression. And it seems nowhere is the imagination more stirred than by euphemisms for masturbation. It's easy to find sites listing 500 phrases and no two lists are the same. Aren't we just marvellous creatures? I now can't recall which particular term I put into Google to find out that 'Arguing with Mr Longfellow' is one of these terms, but I think we can all agree that it's more interesting than a long discussion on poetry. We can probably also see why I did not last long studying English at Cambridge.
The inventiveness of masturbation terms does vary greatly. Many work on the old bastions of rhyme or alliteration. Some are wonderfully visual. But even with an Englishwoman's practised eye for innuendo, some were utterly baffling to me. If a chap were to look at me mischievously and state they were going to go and 'put their foot down' or 'null the void' I would be pushed to think they were off for a quick wank - even if they put a 'knowwhaddimean' + raised eyebrow at the end of their sentence.
Let's be honest here: the act of masturbation is visually strange. This category tries to find suitable verb + object combos to describe that action including cranking the love pump, tickling the pickle, and fiddling the flesh flute. Other verbs used were pulling, rubbing, tossing, squeezing, twanging and tweaking. Just look at that list of verbs and try to tell me English is not a miraculous language.
Anyway, that was a walk through the weird and wonderful world of wanking words. I hope you enjoyed it.`,
    notes: 'Linguistic analysis of something absurd, treated with genuine intellectual curiosity. Cambridge reference dropped casually. The voice is gleefully unafraid of taboo subjects while remaining witty rather than crude. Categorises and analyses with the rigour of an academic paper, applied to nonsense.',
  },
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `Belize is, I'm reliably told, unique among the benefit bludger's kingdoms, in that she is officially the Queen of Belize rather than the Queen of the United Kingdom in her official business there. So the delayed visit must have been another little kick to the gut - at least to those who could give the tiniest rat's arse about the monarchy. If I lived there I'd imagine I'd be too busy gorging myself on shellfish and snorkelling to worry about some bepearled lady 5000 miles away. Especially as she doesn't really have any power.
He's also interested in linguistics, and so pulled together a collection of Belizean creole sayings. They are alternately pithy, wise, a touch baffling and possibly innuendo, but as Young mentions in his preface, a nation's sayings really give you an indication of their outlook, environment and history. This makes it surprising that more British proverbs are not based entirely around the weather - and more particularly rain.
That was a brief tour around the joys of Belizean Creole and a nation's proverbs.`,
    notes: 'Curates and contextualises — takes someone else\'s work (Belizean proverbs) and frames it with her own commentary. "bepearled lady" is a great example of the precise, unexpected word choice. Mixes genuine cultural interest with irreverence toward institutions.',
  },
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `Luxembourg's entire population is slightly more than that of Bristol. So if you've never met someone from Luxembourg, it's as surprising as if you've never met someone from Bristol. Of course, if you live in either of these places and you still haven't met someone from there, you should probably try being a touch more sociable, if only to stop your face being eaten off by cats when you die. "What if I don't have cats?" you might ask, but the answer is that you don't have to actually own them. They can smell a lonely death from 10 furlongs and will break through doors to eat faces off. They're evil. Pure evil.
Anyway, Luxembourg. It's tiny. There are only 19 states in the world smaller.
Luxembourg is also very wealthy. Due to a tiny population, relatively small country, and the 150+ banks and various 'tax haven' company laws, Luxembourg has the highest GDP in the world and is second only to Qatar when you take into account PPP.
It's strange we spend so long trying to attain the perfect society, because those places that are supposed to have attained it are always found incredibly dull. Switzerland, Sweden, Canada, Luxembourg - all frequent visitors to 'most dull places' list and all pretty high on the 'highest quality of life' lists too.
Luxembourg is so uninspiring that this man, while trying to refute how boring the place is, states that the best thing about it is that you can go to places other than Luxembourg easily. Wonderful. That's like going out with a man because you fancy all of his friends. Sure, he's a bit boring, and you repeatedly find yourself justifying why you're with him, but you're in regular proximity to eye candy because of him, and surely that's what everyone wants? Give me the grubby, angry but borderline-disordered London any day.`,
    notes: 'Escalating absurdist aside (the cats digression) that somehow loops back. Simile as argument ("going out with a man because you fancy all of his friends"). Reveals a genuine preference for messy vitality over sanitised perfection — a recurring theme.',
  },
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `The $64,000 Question was a 1950s American gameshow which, it appears, dished out 29 Cadillacs and more than $2 million. The $64,000 question also had a UK version, despite the prize never actually being $64,000.
It's weird: at first I was mildly shocked that such wholesale corruption went on in such an innocent era. Then I remembered that there is not one single era in history which has been 'innocent' and it seems to be a constant project of media to tell us that the times in which we live are the very worst. It's all utter nonsense.
Metrication was a different matter. People were up in arms. People are still up in arms. Some people are just in ARM which is a way of being up in arms both singular and plural. This is a group called Active Resistance to Metrication. It was set up in 2001. That's right. 36 years after metrication. Almost four decades. I can't work out why people say the British are a stubborn, narrow-minded people.
I wouldn't mention this organisation normally - they started with just five people and have now grown to 'dozens' but for the code names they hilariously assume. They are all references to old weights and measures. Not only do they use measures that have since been superseded, trampling heavily all over their own frigging point, but they sound like a Norfolk pornstar collective.
My kneejerk reaction to this is some hearty scoffing, followed by the suggestion that they should really get a hobby. But then, my kneejerk reactions are often twattish, and so I rethought: realistically, these people are exactly the kind of political grassroots movement that is needed - and has been needed for many years. They care. They work hard to make changes that they feel are necessary in the society they want to live in.
It's very easy for people to mock anyone who cares. It's the major reason that the Occupy movement was relatively unsuccessful while the detached, oh-so-fucking-ironic Hipster trend continues. Because if you care, you can be mocked, whereas if you only ever give a shit about anything ironically you can always distance your self from anything uncool.
But if people had taken this strident an attitude to food additives, or supported strikes that would have halted the erosion of labour rules, or just plain stood up and told big business to fuck off, then a lot of the horrible things we see around us wouldn't have happened.
Not that I care or anything. Yeah? Now let's all laugh at the stupid people.`,
    notes: 'Starts frivolous, arrives at a genuinely passionate political point. The pivot from mocking ARM to defending them is characteristic — self-corrects mid-piece, openly ("my kneejerk reactions are often twattish"). The closing sarcasm is controlled anger. This is where the voice gets serious without losing itself.',
  },
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `Harvest mice are the smallest rodent and also the only old-world mammal to have a prehensile tale. If there is one thing I think would be useful for someone as clumsy as I am, it would be a prehensile tail.
Anyway, listen out here for the clang as I drop a name so clumsily that I would need aforementioned tail to catch it.
When I met David Attenborough (at a book signing, it's not as if we're mates) I had been standing in line for about 45 mins and so had started reading the book I was going to get signed. There's a top tip by the way. If you want to read a book for free, just go to a big book signing and stand in the queue for a while. Then just saunter away, book read. Who needs professionals for budgeting advice when you've got me?
Anyway, the first chapter was about sloths. Mr Attenborough had written that the most common question he is asked is what sort of animal he would most like to be, and stated that in polite company he always said 'sloth'. I asked him what he would be if the company wasn't so polite, and he said 'young lady, I couldn't possibly tell you'.
I sort of made some awkward whining noise in an attempt to persuade him (I was starstruck, OK?) and as he signed the book, he looked up at me and winked. "Look it up" and passed me the book, now inscribed with the words "To Ellie, A jird, David Attenborough"
I looked it up and after some searching came upon this little fact: "Remarkably, Shaw's jird is able to mate a staggering 224 times in only two hours."
Now I couldn't possibly say that this was what Mr Attenborough was referring to. But if he was, good on him.`,
    notes: 'Perfect anecdotal storytelling — pre-empts the reader\'s "name-dropper" thought before they have it. Self-aware without being self-conscious. The punchline lands because the setup is unhurried. Classic example of the voice at its most charming.',
  },
  {
    formatType: 'blog',
    subtype: 'entertainment_blog',
    sourceContext: 'Trivial Pursuit blog — entertainment/culture writing, pre-NicelyPut era',
    body: `Tea has, for many years now, been a vital part of British culture: whether just as a beverage we drink mountains of, or as a kind of shorthand for gentility. Perhaps more recently it's also become a point of differentiation from those Americans with their brash, loud coffee nonsense. Tea brings none of this hissing, foaming nonsense. It brings gently warmed teapots and the soft clink of china.
While coffee consumption has been on the increase, we still drink more than twice as much tea. Only Ireland drinks more than that, which surprises me not at all given how much my mother and aunts can crack through - and that's with all that important wine-drinking to be getting on with too.
Despite its 'quintessentially British' reputation, tea is of course Chinese. It had been drunk in China for centuries before various adventurers (read: budding colonialists) brought it back to Europe. Even then it took quite some time before the British would take on these suspiciously 'continental' drinking habits. (As an aside: I love the fact that we are so isolationist that we call people on the same continent as us 'continentals'. It's the most ridiculous attempt at distancing I know, and yet I do it all the time too.)
As the drink's popularity grew, government worked this out and, well, they did what makes sense to most governments: they taxed the shit out of it. 25% tax in fact, a sum so high it almost stopped sales altogether, until it was dropped to 5%.
Because the Daily Mail has apparently been with us in spirit for many years before it officially opened, there was a lot of debate over whether tea was good for your health or whether it would cause 'weakness and melancholy'.
Obviously being British, I prefer tea done right: in a bag, strong as Jack Reacher, milkier than a dairy farmer's dungarees and sweet enough to blast even a port hangover into oblivion.
I'm big on manners. I'm the kind of auntie that won't relinquish a toy or treat until the child has said please, and I will then make damn sure they say thank you afterwards. There is no more awkward moment for me than being in a restaurant with someone who is rude to waitstaff. I would prefer that they drop their trousers and wave their genitals merrily around the restaurant than order food by barking instructions. I truly believe that politeness is the first virtue: it helps put us and society in the right frame of mind and it just makes a difficult day that little bit easier.
Etiquette, however, is a different kettle of fish. This is the issue with etiquette: it doesn't really make any sense. It exists entirely to determine class.`,
    notes: 'Weaves history, cultural commentary and personal opinion seamlessly. "strong as Jack Reacher, milkier than a dairy farmer\'s dungarees" — triple simile with escalating absurdity. The manners vs etiquette distinction reveals genuine values. Parenthetical self-awareness ("and yet I do it all the time too").',
  },
]

// --- Social samples (split from social-media.txt) ---

const socialSamples = [
  {
    formatType: 'social',
    subtype: 'linkedin_post',
    sourceContext: 'LinkedIn — personal/origin story post',
    body: `When I was 15 I dropped some acid, drew a penguin on a Tupperware lid and created a new language with him. I then started the serious business of mapping the entire human psyche so I could fix all the world's problems.

10 mins later I was goggling at an episode of Eurotrash - bizarre at the best of times - and all such plans for world peace (/domination?) were gone.

But the idea of mapping things - of drawing parallels, finding patterns and working out the underlying machinery of the world - stayed with me.

In ways I'm still trying to work out I think software, social media and the internet has simultaneously pulled us closer to pattern recognition, while also shifting us away from it.

We have become terribly adept at building recognition based on ephemera rather than material reality.

Which is why I love hard tech. Because it forces you into the world of atoms. Material reality doesn't get much more material than defence systems, biology, energy production/storage or robots that have to interact meaningfully with the world around them.

So I'm starting something. In a way it's a continuation of that blitzed out, teen-Ellie's grand ambitions.`,
    notes: 'Origin story that opens with something most LinkedIn users would never admit. Moves from personal absurdity to a genuine philosophical point about pattern recognition. The hook works because it\'s unexpected and honest, not because it\'s shocking for shock\'s sake.',
  },
  {
    formatType: 'social',
    subtype: 'linkedin_post',
    sourceContext: 'LinkedIn — pitch deck strategy, NicelyPut era',
    body: `What's the biggest issue with most startup pitch decks?

Too much orange.

How do I know? And how do you fix 'too much orange'?

A while back I was struggling to work out how to talk about structure in a pitch deck.

I was thinking "well, it's kind of abstract and there's a bit of 'gut-feel' to it. How do you nail it all down in a sodding LinkedIn post?"

Then I realised I was being an eejit, and it wasn't abstract at all. Structure is a physical thing (obvs) and we can just colour-code - so you can see it at a glance.

And I realised that was a really, really dull process so I just got AI to do it instead.

And thus, the Deck Flow Analysis was born.

And in the vast majority of decks I see, there is too much orange. Too much science. All the science.

Of course science needs to be there. But it needs to be contextualised.

Science investors obviously care about science. But the word 'investment' doesn't mean 'donating money to scientists so they can stay in the lab'.

They want to 'do well by doing good'.

Which means you need to show them how the 'do well' bit works.

So aim for less orange. Save that for the academic presentations.

Make your *pitch* structure a multicoloured investor love-fest and you'll be head and shoulders above the vast majority of founders they see.`,
    notes: 'Hook is a mystery ("too much orange") that pulls the reader in. Self-deprecating process reveal ("really dull process so I just got AI to do it"). Delivers practical advice without sounding like a thought leader. The closing CTA is direct without being pushy.',
  },
  {
    formatType: 'social',
    subtype: 'linkedin_post',
    sourceContext: 'LinkedIn — pitch deck strategy, NicelyPut era',
    body: `One of the reasons I love working with high-expertise founders is they don't tend to bullshit.

These aren't people chasing the 'founder' title like they've got a Silicon Valley-shaped hole in their heart. They're scientists and engineers who've built careers on solving real problems with real evidence.

But they're deep in the weeds on the tech or science behind their solution.

Which is why working on a pitch deck can reveal weaknesses in the wider commercial strategy.

My role as a pitch deck strategist isn't to paper over those cracks with marketing speak; it's to help identify them and work out what can be done.

How do we tell the story in a way that's genuine? In a way that doesn't make these founders feel dirty in the telling of it? In a way that makes them excited, not reluctant, to pitch?

The process of developing a pitch can be a kind of reverse-engineering your way to a story that's both compelling AND true, via a strategy that supports the story you want to tell.`,
    notes: 'Positioning through values rather than credentials. "Silicon Valley-shaped hole in their heart" is a perfect example of the unexpected image that makes a point stick. The triple rhetorical question builds rhythm. Shows genuine respect for the audience without being deferential.',
  },
  {
    formatType: 'social',
    subtype: 'linkedin_post',
    sourceContext: 'LinkedIn — opinion/worldview post',
    body: `I have a half-arsed theory that the massive shift into software and knowledge work is partially responsible for the massive unreal-ing of our world.

People who work in the real world have constant feedback mechanisms because they have to work within the reality of physics.

Hard tech entrepreneurs can't just keep saying "gravity makes things float upwards" and eventually just reshape the laws of nature around their words.

My electrician brother can't pretend electricity is actually just an oppressed force yearning to be free because unoppressing that voltage will knock him on his arse.

My renovator other half can't just hit Ctrl + Z if he drills into a pipe or cuts a tile wrong. He can't tell someone that leaking toilet is actually a response to the minority stress it experiences as the least loved bathroom fixture.

I think this might be the most urgent problem to fix in our Western societies, because some of the most abhorrent people on the planet are really making the most of it.`,
    notes: 'Opens by undermining her own authority ("half-arsed theory") then builds a compelling argument through concrete examples. Each example escalates in absurdity while the underlying point gets sharper. Politically direct without being preachy — the humour does the persuasive work.',
  },
  {
    formatType: 'social',
    subtype: 'linkedin_post',
    sourceContext: 'LinkedIn — pitch deck strategy, NicelyPut era',
    body: `I found 50 hard tech pitch decks online and it taught me… absolutely feck all.

I mean, as a pitch obsessive I learned things that are useful to *me*. But I'm a bloody weirdo who spent 20 years building presentations so I can get excited over a well-placed border line.

But hard tech founders will mostly get led astray by online pitch decks, because:

The SaaS-ness of it all — The 50+ decks in hardware were about 5% of all the decks I found. The vast majority were consumer or SaaS. So if you don't filter heavily you'll be fishing in the wrong waters.

Context mismatch — A Star Trek-level moonshot by a world-renowned team raising from Sovereign Wealth Funds in the Middle East is a very different raise to a drug development company from a first-time founder looking for Pre-Seed angels in the UK.

Your story is unique — Imagine if every biopic charted exactly the same points of a life. "This was Freddie Mercury at 1 year old, 5 years old, 20 years old and 50 years old… Oh, and here's Mozart, Mandela and Malala at the same ages." Congrats. You have four catastrophically crap films.

If you're getting polite passes and can't figure out why, it's rarely the slides. It's more common that you're answering the wrong questions with your deck; ones that templates or sample decks make you think you should answer, vs the ones your investment case demands.`,
    notes: 'Counter-intuitive hook (research that taught nothing). Self-deprecating framing before delivering genuine expertise. The biopic analogy is memorable and does the heavy lifting — shows rather than tells why templates fail. Closes with the real insight rather than a CTA.',
  },
  {
    formatType: 'social',
    subtype: 'linkedin_post',
    sourceContext: 'LinkedIn — product launch / soft sell post',
    body: `I've somehow ended up building a very boring assessment tool for pitch decks.

It doesn't look at design, visuals, or how "good" the deck is.
It doesn't score you, rank you, or tell you how fundable you are.
There's nary a glimmer of a story arc or narrative framework.

All the tool does is look at what your deck is actually conveying.

But I fervently believe that this kind of 'boring' is exactly what most founders need way before any assessment on narrative or design.

The founders I work with have lived and breathed their company for so long that bringing all the moving parts together in one document is like wrestling an octopus. Especially when the company doesn't magically stop evolving while you raise (so... wrestling an octopus that keeps growing new legs).

So even when the slides look great and the narrative feels solid, the underlying investment argument can get a bit… mushy.

This has always mattered, but it matters more now. Increasingly, decks are being read by AI tools during screening. Unlike humans, they don't get carried by a good story or infer generously if they like a specific sector or founder. They just look for whether the case is actually there.

It's just a way of getting a clearer, more external read on your deck before you take it into a room.

I'm looking for a few people to try it and tell me whether it's useful.

Up for it? Let me know.`,
    notes: 'Anti-sell that sells. Opens by calling the product boring — disarms cynicism instantly. The octopus metaphor extended ("growing new legs") is characteristic. CTA is low-pressure and genuine. Shows commercial writing that doesn\'t feel commercial.',
  },
]

// --- Run seeding ---

async function main() {
  // Check if samples already exist for this brand
  const existing = await sql`SELECT COUNT(*) as count FROM dna_tov_samples WHERE brand_id = ${BRAND_ID}`
  if (existing[0].count > 0) {
    console.log(`⚠ ${existing[0].count} samples already exist for brand ${BRAND_ID}. Skipping seed.`)
    console.log('  To re-seed, delete existing samples first:')
    console.log(`  DELETE FROM dna_tov_samples WHERE brand_id = '${BRAND_ID}';`)
    return
  }

  const allSamples = [...blogSamples, ...socialSamples]

  console.log(`Seeding ${allSamples.length} writing samples (${blogSamples.length} blog, ${socialSamples.length} social)...`)

  for (const sample of allSamples) {
    await sql`
      INSERT INTO dna_tov_samples (brand_id, format_type, subtype, body, notes, source_context, is_current)
      VALUES (${BRAND_ID}, ${sample.formatType}, ${sample.subtype}, ${sample.body}, ${sample.notes}, ${sample.sourceContext}, true)
    `
    console.log(`  ✓ ${sample.formatType}/${sample.subtype}: ${sample.body.substring(0, 60)}...`)
  }

  console.log(`\nDone. ${allSamples.length} samples seeded.`)

  // Verify
  const counts = await sql`
    SELECT format_type, COUNT(*) as count
    FROM dna_tov_samples
    WHERE brand_id = ${BRAND_ID}
    GROUP BY format_type
  `
  console.log('\nSamples by format type:')
  for (const row of counts) {
    console.log(`  ${row.format_type}: ${row.count}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
