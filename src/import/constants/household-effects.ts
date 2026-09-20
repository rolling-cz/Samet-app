/** How a household effect turns into impacts on resources (§4.4). */

/**
 * The one resource a household effect moves for now.
 *
 * The spec derives the transfer only for `Wealth`; another shared resource
 * would need its own decision about who takes what, and the author would
 * notice a silent guess only in a printed document.
 */
export const HOUSEHOLD_TRANSFER_RESOURCE_KEY = 'Wealth'

/**
 * Placeholder the org types the amount into, per member — `{input1}` for the
 * first character of the effect, `{input2}` for the second, in the order the
 * author wrote them. How much each puts in or takes out is never computed.
 */
export const HOUSEHOLD_INPUT_KEYS = Object.freeze(['input1', 'input2'] as const)
