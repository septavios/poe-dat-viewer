export function poedbBase (patchVersion: string): string {
  return patchVersion?.startsWith('4.') ? 'https://poe2db.tw/us' : 'https://poedb.tw/us'
}

let cachedToken: string | null = null
export function getPoedbToken (): string | null {
  if (cachedToken !== null) return cachedToken
  try {
    cachedToken = localStorage.getItem('poedb.token')
  } catch {}
  return cachedToken
}

export function setPoedbToken (token: string) {
  cachedToken = token || null
  try {
    if (token) localStorage.setItem('poedb.token', token)
    else localStorage.removeItem('poedb.token')
  } catch {}
}

export function poedbSearchUrl (patchVersion: string, query: string): string {
  const base = poedbBase(patchVersion)
  const q = encodeURIComponent(query)
  const token = getPoedbToken()
  if (token) return `${base}/search?token=${token}&q=${q}`
  return `${base}/search?q=${q}`
}

export function poedbUrlForTable (patchVersion: string, tableName: string): string {
  return poedbSearchUrl(patchVersion, tableName)
}

export function poedbUrlForRow (
  patchVersion: string,
  tableName: string,
  nameOrId: string
): string {
  const term = [tableName, nameOrId].filter(Boolean).join(' ')
  return poedbSearchUrl(patchVersion, term)
}
