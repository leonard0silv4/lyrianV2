import type { Measurement } from './measurements.api'

/**
 * Busca tolerante por medida: "4x3" acha "4m x 32m" (cada dimensão é
 * comparada por substring, não igualdade exata) — o operador digita os
 * primeiros dígitos que lembra em vez de precisar saber o valor exato.
 */
export function filterMeasurements(measurements: Measurement[], rawQuery: string): Measurement[] {
  const raw = rawQuery.trim().toLowerCase()
  if (!raw) return measurements

  const dimsMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)?$/)
  if (dimsMatch) {
    const larguraQ = dimsMatch[1].replace(',', '.')
    const comprimentoQ = dimsMatch[2]?.replace(',', '.')
    return measurements.filter((m) => {
      const matchesLargura = String(m.larguraBobina).includes(larguraQ)
      const matchesComprimento = comprimentoQ === undefined ? true : String(m.comprimentoBobina).includes(comprimentoQ)
      return matchesLargura && matchesComprimento
    })
  }

  const q = raw.replace(/m$/, '')
  return measurements.filter((m) => String(m.larguraBobina).includes(q) || String(m.comprimentoBobina).includes(q))
}
