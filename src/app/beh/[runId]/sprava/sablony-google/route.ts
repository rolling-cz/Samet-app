import { findRun } from '@/db'
import { fetchGoogleTemplates } from '@/features/sprava/services/fetch-google-templates'

/** ~90 tabs six at a time; the batch itself stops at 45 s and reports the rest. */
export const maxDuration = 60

interface GoogleTemplatesRouteContext {
  params: Promise<{ runId: string }>
}

/** A route handler rather than a server action: it returns a zip for the form, and writes nothing. */
export const POST = async (request: Request, { params }: GoogleTemplatesRouteContext) => {
  const { runId } = await params
  if (!(await findRun(runId))) return new Response(null, { status: 404 })

  return Response.json(await fetchGoogleTemplates(await request.formData()))
}
