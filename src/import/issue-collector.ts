/**
 * Collects findings without ever throwing. The import never stops at the first
 * problem — the author wants to fix twenty typos in one round (§10.2).
 */
import type { Issue, IssueCode, IssueLocation } from './types/issue'

export class IssueCollector {
  private readonly items: Issue[] = []

  add(issue: Issue): void {
    this.items.push(issue)
  }

  error(code: IssueCode, location: IssueLocation, message: string, extra?: Partial<Issue>): void {
    this.add({ severity: 'error', code, location, message, ...extra })
  }

  warn(code: IssueCode, location: IssueLocation, message: string, extra?: Partial<Issue>): void {
    this.add({ severity: 'warning', code, location, message, ...extra })
  }

  get all(): readonly Issue[] {
    return this.items
  }

  get errors(): readonly Issue[] {
    return this.items.filter((i) => i.severity === 'error')
  }

  get warnings(): readonly Issue[] {
    return this.items.filter((i) => i.severity === 'warning')
  }

  get hasErrors(): boolean {
    return this.items.some((i) => i.severity === 'error')
  }
}
