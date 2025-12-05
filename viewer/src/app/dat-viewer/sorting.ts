import { readColumn, type DatFile, type Header } from 'pathofexile-dat/dat.js'

export function sortRows(criteria: { header: Header, order: 1 | -1 }[], datFile: DatFile): number[] {
  const rows = Array.from({ length: datFile.rowCount }, (_, idx) => idx)
  if (!criteria.length) return rows

  const cols = criteria.map(c => ({
    ...c,
    data: readColumn(c.header, datFile)
  }))

  rows.sort((ai, bi) => {
    for (const { header, order, data } of cols) {
      let result = 0
      if (header.type.array) {
        const a = data[ai] as unknown[]
        const b = data[bi] as unknown[]
        result = (b.length - a.length) * order
      } else if (header.type.boolean) {
        const a = Number(data[ai] as boolean)
        const b = Number(data[bi] as boolean)
        result = (a - b) * order
      } else if (header.type.string) {
        const a = data[ai] as string
        const b = data[bi] as string
        result = a.localeCompare(b) * order
      } else if (header.type.integer || header.type.decimal) {
        const a = data[ai] as number
        const b = data[bi] as number
        result = (b - a) * order
      } else if (header.type.key) {
        if (header.type.key.foreign) {
          const a = data[ai] as number | null
          const b = data[bi] as number | null
          result = ((b || 0) - (a || 0)) * order
        } else {
          const a = Number(data[ai] as number | null)
          const b = Number(data[bi] as number | null)
          result = (b - a) * order
        }
      }
      if (result !== 0) return result
    }
    return 0
  })

  return rows
}
