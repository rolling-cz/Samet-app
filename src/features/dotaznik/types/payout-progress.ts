/** „rozděleno 7 z 10" under a `HOUSEHOLD_DISSOLVE` (§4.4). The engine still decides; this saves a round. */
export interface PayoutProgress {
  distributed: number
  balance: number
  /** Every field holds a number and they add up to the balance. */
  matches: boolean
}
