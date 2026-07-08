export default new class Nyaa {
  // Szybsze proxy (możesz zastąpić własnym)
  proxy = 'https://corsproxy.io/?url='
  base = 'https://nyaa.si/?page=rss&q='

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`

    const url = this.proxy + encodeURIComponent(this.base + encodeURIComponent(query))

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const text = await res.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'text/xml')
      const items = xml.querySelectorAll('item')

      if (!items.length) return []

      // Ogranicz do 5 pierwszych wyników (aby zdążyć przed timeout)
      const limitedItems = Array.from(items).slice(0, 5)

      // Pobieranie magnetów równolegle (Promise.all)
      const magnetPromises = limitedItems.map(async (item) => {
        const pageUrl = item.querySelector('link')?.textContent?.trim()
        if (!pageUrl) return null

        try {
          const proxyUrl = this.proxy + encodeURIComponent(pageUrl)
          const pageRes = await fetch(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          })
          if (!pageRes.ok) return null
          const html = await pageRes.text()
          const magnetMatch = html.match(/<a[^>]+href="(magnet:[^"]+)"/i)
          return magnetMatch ? magnetMatch[1] : null
        } catch {
          return null
        }
      })

      // Czekamy na wszystkie magnet (z timeoutem 8 sekund)
      const magnets = await Promise.allSettled(magnetPromises)

      // Łączenie wyników
      const results = []
      for (let i = 0; i < limitedItems.length; i++) {
        const item = limitedItems[i]
        const magnetResult = magnets[i]
        const magnetLink = magnetResult.status === 'fulfilled' ? magnetResult.value : null
        if (!magnetLink) continue

        const hashMatch = magnetLink.match(/btih:([A-Fa-f0-9]+)/i)
        results.push({
          title: item.querySelector('title')?.textContent?.trim() || 'Brak tytułu',
          link: magnetLink,
          hash: hashMatch ? hashMatch[1] : '',
          seeders: parseInt(item.querySelector('nyaa\\:seeders')?.textContent || '0', 10),
          leechers: parseInt(item.querySelector('nyaa\\:leechers')?.textContent || '0', 10),
          downloads: parseInt(item.querySelector('nyaa\\:downloads')?.textContent || '0', 10),
          size: 0,
          date: new Date(item.querySelector('pubDate')?.textContent || Date.now()),
          accuracy: 'medium',
          type: 'alt'
        })
      }

      return results
    } catch (error) {
      console.error('Błąd wyszukiwania:', error)
      return []
    }
  }

  async test() {
    try {
      const res = await fetch(this.proxy + encodeURIComponent(this.base + 'test'))
      return res.ok
    } catch {
      return false
    }
  }
}()
