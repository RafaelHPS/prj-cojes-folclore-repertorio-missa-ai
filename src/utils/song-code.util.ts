const MIN_DIGITS = 3

/**
 * Formata o código sequencial da música para exibição (ex.: 7 → "#007").
 * Códigos acima de 999 crescem naturalmente, sem truncar.
 */
export function formatSongCode(code: number): string {
  return `#${String(code).padStart(MIN_DIGITS, '0')}`
}
