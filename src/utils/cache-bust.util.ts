/** Adiciona ?t=<timestamp> à URL para invalidar cache de CDN/browser quando o arquivo é atualizado. */
export function bustCache(url: string, updatedAt: string): string {
  const t = new Date(updatedAt).getTime()
  return `${url}?t=${t}`
}
