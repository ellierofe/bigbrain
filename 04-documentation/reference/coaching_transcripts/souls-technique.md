# The Souls Technique
*Idea from Demetrius, State Change Mastermind, 31 March 2026*

---

## The idea

Before presenting to specific people, create a lightweight model of each person — their "soul" — and use it to query your knowledge base from *their* perspective, rather than from a neutral or your own perspective.

The goal: surface what *they* will find interesting, what follow-up questions they'll ask, and what domains they'll want to go deeper on — before you walk in the room.

---

## How to build a soul

A soul is not a full profile. It's a minimal model: the mental filters, burning questions, and interests that will shape how someone receives information.

**Sources to draw from:**
- Interview or conversation transcripts (questions they asked, language they used, what they pushed on)
- Public writing, speeches, or published positions
- Professional background and domain expertise
- Known frustrations, fears, or priorities

**What to extract:**
- Their core frame (how they see the world / their domain)
- What they care about most (outcomes, not just topics)
- The questions they tend to ask
- What they're likely to *not* care about
- Any gaps or blind spots worth bridging

**Format:** A short document or structured prompt that can be passed to an LLM as context. Think of it as a system prompt that models this person's perspective.

---

## How to use it

Once you have a soul, use it to query your knowledge base or research in character:

1. Load the soul as context
2. Ask: *"Given this person's perspective and interests, what in this dataset would they find most significant?"*
3. Ask: *"What questions would they likely ask about this?"*
4. Ask: *"What follow-up questions would those questions lead to?"*
5. Ask: *"What would they probably push back on or be sceptical of?"*

This gives you a shaped, audience-specific view of your own research — rather than a neutral summary that you then have to manually translate.

---

## For April 8th (SDP party leader + chairman)

Ellie has 90-minute interview transcripts for both of them. Starting material is already there.

**Steps:**
1. Extract souls from the transcripts — one document per person
2. Run each soul against the knowledge graph outputs (policy mapping, constituency targeting, donor network)
3. Generate: what will each of them find most compelling? What will they want to drill into? What might land flat?
4. Use the outputs to structure the presentation and anticipate the room

**Practical note:** The two of them will likely respond differently to the same data. Running two souls separately will make the differences visible — you can adjust emphasis in the room depending on who's driving the conversation.

---

## Broader use

This technique is useful any time you're translating research or analysis for a specific audience:

- Pitches and presentations
- Proposals (what does *this* client care about?)
- Content (what would *this* reader find useful vs. generic?)
- Donor or investor outreach

It's essentially a structured empathy exercise made computable — you're not guessing what someone cares about, you're deriving it from evidence and then applying it systematically.

---

## Ellie's note on the name

"Extracting their souls" — eldritch, yes, but accurate. You're not building a full simulation of a person. You're pulling out the part of them that will be in the room with you.
