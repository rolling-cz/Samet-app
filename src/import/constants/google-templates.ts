/**
 * Inside every zip „Načíst z Google" produces: the download report, kept in the
 * archive as the record of which URL each template came from. Its presence is
 * also what marks the zip's templates as Google's — they win over uploaded
 * files for the same owner and chapter (§10.2), whatever the upload order.
 */
export const DOWNLOAD_REPORT_FILE = '_stazeni.json'
