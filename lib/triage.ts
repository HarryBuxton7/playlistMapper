import type { Track, CategoryName } from '@/types'

const BATCH_SIZE = 50
const CONCURRENCY = 1

interface TriageResult {
  id: string
  category: CategoryName
}

async function triageBatch(tracks: Track[]): Promise<TriageResult[]> {
  const res = await fetch('/api/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tracks: tracks.map((t) => ({
        id: t.id,
        name: t.name,
        artistName: t.artistName,
        albumName: t.albumName,
      })),
    }),
  })
  if (!res.ok) throw new Error(`Triage request failed: ${res.status}`)
  return res.json()
}

export async function triageAllTracks(
  tracks: Track[],
  onBatchDone: (results: TriageResult[], done: number, total: number) => void
): Promise<Map<string, CategoryName>> {
  const batches: Track[][] = []
  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    batches.push(tracks.slice(i, i + BATCH_SIZE))
  }

  const resultMap = new Map<string, CategoryName>()
  let done = 0

  async function processBatch(batch: Track[]): Promise<void> {
    const results = await triageBatch(batch)
    for (const r of results) {
      resultMap.set(r.id, r.category)
    }
    done += batch.length
    onBatchDone(results, done, tracks.length)
  }

  // Run up to CONCURRENCY batches in parallel
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    await Promise.all(batches.slice(i, i + CONCURRENCY).map(processBatch))
  }

  return resultMap
}
