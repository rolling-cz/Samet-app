import { outputFileResponse } from '@/features/vystupy/services/output-file-response'

/** Rendering both merged PDFs and packing the zip, on top of a possible cold start. */
export const maxDuration = 60

interface OutputFileRouteContext {
  params: Promise<{ runId: string; chapter: string; file: string }>
}

export const GET = async (_request: Request, { params }: OutputFileRouteContext) => {
  const { runId, chapter, file } = await params

  return outputFileResponse(runId, chapter, file)
}
