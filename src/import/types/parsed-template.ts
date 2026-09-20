/** A `.md` template uploaded alongside the workbook (§10.2). */
export interface ParsedTemplate {
  /** Character or group ID from the file name; undefined when it does not parse. */
  ownerRef?: string
  /** Chapter from the file name; undefined when it does not parse. */
  chapter?: number
  filename: string
  markdown: string
  blockIds: string[]
  variables: string[]
  problems: { line: number; raw: string; detail: string }[]
}

/** A template as it arrives from the upload, before its markers are read. */
export interface UploadedTemplate {
  filename: string
  markdown: string
}
