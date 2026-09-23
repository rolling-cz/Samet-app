export interface ConcurrencyOptions<T, R> {
  /** How many workers run at once. */
  limit: number
  /** Epoch ms; an item not started by then is not started at all. */
  deadline?: number
  /** The result for an item skipped by the deadline — reported, never silently missing. */
  onSkip?: (item: T, index: number) => R
  /** Injectable for tests. */
  now?: () => number
}

/**
 * `Promise.all` over a bounded pool, results in input order.
 *
 * A serverless function killed at its time limit returns nothing at all; with
 * a deadline, the items that did not fit come back as `onSkip` results and the
 * caller can say which ones were not attempted.
 */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  { limit, deadline, onSkip, now = Date.now }: ConcurrencyOptions<T, R>,
): Promise<R[]> => {
  if (!Number.isInteger(limit) || limit < 1) throw new Error(`Neplatný počet souběžných úloh: ${limit}.`)
  if (deadline !== undefined && onSkip === undefined) throw new Error('Termín bez onSkip by položky tiše zahodil.')

  const results = new Array<R>(items.length)
  let next = 0

  const run = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      const item = items[index] as T
      results[index] = deadline !== undefined && onSkip && now() >= deadline ? onSkip(item, index) : await worker(item, index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))

  return results
}
