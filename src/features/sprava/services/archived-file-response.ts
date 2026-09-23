import { eq } from 'drizzle-orm'
import { forRun, parseRunId } from '@/db'
import { uploadedFiles } from '@/db/schema'
import { archiveDownloadName, ARCHIVE_CONTENT_TYPES, FALLBACK_CONTENT_TYPE, HTTP_NOT_FOUND, UUID_PATTERN } from '../constants/archive-download'
import { attachmentDisposition } from '@/utils/content-disposition'

const contentTypeFor = (filename: string): string =>
  ARCHIVE_CONTENT_TYPES[filename.split('.').at(-1)?.toLowerCase() ?? ''] ?? FALLBACK_CONTENT_TYPE

const isRunId = (value: string): boolean => {
  try {
    parseRunId(value)

    return true
  } catch {
    return false
  }
}

/**
 * The bytes exactly as uploaded (§6.5). The run ID prefixes the filename, so a
 * downloaded file can never be mistaken for the other run's (§3.3).
 */
export const archivedFileResponse = async (runId: string, fileId: string): Promise<Response> => {
  if (!UUID_PATTERN.test(fileId) || !isRunId(runId)) return new Response(null, { status: HTTP_NOT_FOUND })

  const [file] = await forRun(runId).selectColumns(
    uploadedFiles,
    { filename: uploadedFiles.filename, content: uploadedFiles.content },
    eq(uploadedFiles.id, fileId),
  )
  if (!file) return new Response(null, { status: HTTP_NOT_FOUND })

  return new Response(new Uint8Array(file.content), {
    headers: {
      'Content-Type': contentTypeFor(file.filename),
      'Content-Disposition': attachmentDisposition(archiveDownloadName(runId, file.filename)),
    },
  })
}
