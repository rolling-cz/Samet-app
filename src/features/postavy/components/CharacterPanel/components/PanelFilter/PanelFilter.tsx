import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import type { ChangeEvent } from 'react'
import { postavy } from '@/locales/cs/postavy'
import styles from './PanelFilter.module.css'

interface PanelFilterProps {
  query: string
  onlyUnfilled: boolean
  onQuery: (event: ChangeEvent<HTMLInputElement>) => void
  onOnlyUnfilled: (event: ChangeEvent<HTMLInputElement>) => void
}

export const PanelFilter = ({ query, onlyUnfilled, onQuery, onOnlyUnfilled }: PanelFilterProps) => (
  <div className={styles.filter}>
    <TextField
      type="search"
      value={query}
      onChange={onQuery}
      placeholder={postavy.searchLabel}
      margin="none"
      fullWidth
      slotProps={{ htmlInput: { 'aria-label': postavy.searchLabel, 'data-testid': 'character-panel--search' } }}
    />
    <FormControlLabel
      className={styles.toggle}
      control={<Checkbox size="small" checked={onlyUnfilled} onChange={onOnlyUnfilled} />}
      label={postavy.onlyUnfilled}
      data-testid="character-panel--only-unfilled"
    />
  </div>
)
