import { useCallback, useState, type ChangeEvent } from 'react'

/** One org's convenience, not application state — so it stays out of the address (§6.4). */
export const usePanelFilter = () => {
  const [query, setQuery] = useState('')
  const [onlyUnfilled, setOnlyUnfilled] = useState(false)

  const handleQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), [])

  const handleOnlyUnfilled = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setOnlyUnfilled(event.target.checked),
    [],
  )

  return { query, onlyUnfilled, handleQuery, handleOnlyUnfilled }
}
