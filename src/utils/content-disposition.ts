/** ASCII fallback plus RFC 5987 `filename*`, so diacritics in the filename survive (§13). */
export const attachmentDisposition = (filename: string): string => {
  const ascii = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]|["\\]/g, '_')

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
