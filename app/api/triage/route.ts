import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { CATEGORY_NAMES } from '@/types'
import type { CategoryName } from '@/types'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a music classification expert. Your sole task is to assign each song to exactly one of seven mood and energy categories.

CRITICAL: Classification is NOT based on genre. Genre is completely irrelevant. A jazz track and an ambient electronic track can share a category. Two hip-hop tracks can be in completely different categories. The only question is: what does this music do for the listener, and when would they reach for it?

Classification uses three factors in order:
1. ENERGY LEVEL — how activating or calming (low / medium / high)
2. EMOTIONAL VALENCE — how dark or bright the music feels (dark / neutral / bright)
3. SITUATIONAL FUNCTION — when would someone choose to listen to this

If a track could fit two categories, situational function is always the tiebreaker.

━━━ THE SEVEN CATEGORIES ━━━

FLOW | Energy: medium–low | Valence: neutral
Focus music. Occupies just enough attention to block distraction without competing with thought. Put on for coding, writing, studying, deep work. The music must NOT have a strong emotional opinion — it should not make you feel sad, happy, or pumped up. It creates a texture of concentration. Vocals only work if treated as texture (e.g. shoegaze), not as language. If you find yourself listening to the words, it belongs elsewhere. Typical sounds: lo-fi beats, ambient, post-rock instrumentals, classical piano or strings, minimal techno, instrumental jazz.

RUSH | Energy: high | Valence: neutral to positive (intense, forward-moving)
High-energy momentum music. Workouts, running, driving fast, getting hyped. The defining quality is tempo and forward motion — the music should feel like it is pushing you harder. Genre is irrelevant: aggressive rap, drum and bass, high-tempo EDM, punk rock, power pop all sit here. Distinction from Glow: Rush pushes harder, Glow floats higher. You would never put Rush on at a dinner party, and you would never run a marathon to Glow. Distinction from Edge: Rush says "let's go." Edge says "watch out." If intensity is positive and propulsive — Rush. If intensity comes with darkness or menace — Edge.

GLOW | Energy: medium–high | Valence: strongly positive
Bright, sociable, feel-good music. The "everything's alright" register. Pre-drinks, cooking with friends, sunny morning walks, casual gatherings. Music that makes the room feel lighter. Could play at a relaxed social gathering and make people feel good without demanding attention. Typical sounds: pop, funk, disco, upbeat indie, summery R&B, afrobeats, reggae, soul.

UNWIND | Energy: low | Valence: positive to neutral
Wind-down music. Evenings in, reading alone, quiet nights in, decompressing after a long day. Feels like a warm blanket — gives permission to stop. Distinction from Lock In: Lock In is functional and productivity-oriented; Unwind is restorative and leisure-oriented. You would not work to Unwind music (too warm and inviting). You would not relax to Lock In music (too flat to feel like a reward). Distinction from Feels: Unwind is emotionally neutral by design — it is comfort. Feels is emotionally loaded — it wants you to engage. Soft jazz piano trio in the background is Unwind. Bon Iver quietly breaking your heart is Feels. Typical sounds: soft indie, acoustic singer-songwriter, neo-soul, chill jazz, bossa nova, easy-listening electronic, mellow R&B.

SOUL | Energy: any | Valence: dark or emotionally complex
Emotionally heavy music at any point on the energy spectrum. Music you put on when you actually want to feel something — to process, reflect, wallow, be moved, sit with sadness or nostalgia or bittersweetness. You do NOT put Soul on in the background. You put it on because you want to engage with the emotion. Covers quiet devastating folk songs to loud cathartic rock to soul-baring hip-hop. Sorting criterion: does the music make you feel something in your chest? Is it reaching for an emotional response rather than serving a functional purpose? If yes — Soul. Typical sounds: ballads, confessional singer-songwriter, sad indie, blues, emotionally heavy hip-hop, orchestral pieces with strong emotional arcs, post-punk with melancholy.

EDGE | Energy: high | Valence: dark/negative (top-left of the grid)
High-energy, dark, intense, confrontational music. NOT sad music — heavy music. Aggressive, forceful, sometimes angry, sometimes relentlessly dark and powerful. You put it on when you want to feel dangerous, when you are in a dark headspace and want music that matches it. The intensity comes with darkness, weight, confrontation, or a sense of menace. Distinction from Drive: Drive is intense and positive/propulsive. Edge is intense and dark/menacing. Typical sounds: metal, hardcore and underground rap, industrial, drill, darkwave, aggressive electronic, noise rock, heavy post-punk.

NIGHT | Energy: medium | Valence: slightly dark/atmospheric
Late-night, atmospheric music for after midnight. Fits contexts where the world has gotten smaller and quieter — late night drives, intimate moments, 2am headphone sessions. The music feels wrong at noon on a Tuesday but perfect at 1am on a Saturday. Distinction from Unwind: Unwind is about resting; Night is about inhabiting the dark hours. Unwind could play at 7pm. Night belongs after the world goes quiet. Distinction from Feels: Feels wants you to engage emotionally; Night wants you to sink into an atmosphere. Night is not about processing feelings — it is about existing in a vibe. Typical sounds: deep house, downtempo electronic, R&B slow jams, trip-hop, dream pop, dark ambient with rhythm, late-night jazz.

━━━ GENRE IS NOT A SIGNAL ━━━
Jazz → spans Lock In, Unwind, Night, Feels
Hip-hop → spans Drive, Glow, Feels, Edge
Electronic → spans every category
Pop → spans Drive, Glow, Feels
Always ask: what is this music DOING, not what KIND of music is it.

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON array. No explanation, no markdown, no extra text.
Format: [{"id":"track_id","category":"Category Name"},...]
Valid category names (use exactly): Flow, Rush, Glow, Unwind, Soul, Edge, Night
Every input track must appear in the output exactly once.`

interface TrackInput {
  id: string
  name: string
  artistName: string
  albumName: string
}

const VALID_CATEGORIES = new Set<string>(CATEGORY_NAMES)

function toValidCategory(raw: string): CategoryName {
  if (VALID_CATEGORIES.has(raw)) return raw as CategoryName
  return 'Unwind' // safe fallback
}

export async function POST(req: NextRequest) {
  try {
    const { tracks } = (await req.json()) as { tracks: TrackInput[] }

    const trackList = tracks
      .map((t, i) => `${i + 1}. id:${t.id} | ${t.name} | ${t.artistName} | ${t.albumName}`)
      .join('\n')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Classify these ${tracks.length} tracks. Return a JSON array with exactly ${tracks.length} objects in the same order, each with "id" and "category".\n\n${trackList}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]'

    // Extract JSON array from response (handles any surrounding text)
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      // Fall back: assign Unwind to all tracks in this batch
      return NextResponse.json(tracks.map((t) => ({ id: t.id, category: 'Unwind' })))
    }

    const raw: { id: string; category: string }[] = JSON.parse(match[0])
    const results = raw.map((r) => ({ id: r.id, category: toValidCategory(r.category) }))

    return NextResponse.json(results)
  } catch (err) {
    console.error('Triage error:', err)
    return NextResponse.json({ error: 'Triage failed' }, { status: 500 })
  }
}
