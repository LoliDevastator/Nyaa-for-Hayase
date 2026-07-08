export default new class Nyaa {
  // UŻYJ SWOJEGO ADRESU PROXY CLOUDFLARE
  base = 'https://moje-proxy-nyaa.francesco1377711.workers.dev/?page=rss&q='

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`

    const url = this.base + encodeURIComponent(query)

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const text = await res.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'text/xml')
      
      const items = xml.querySelectorAll('item')
      if (!items.length) return []

      // Ogranicz do 5 wyników dla szybkości
      const limitedItems = Array.from(items).slice(0, 5)

      const results = []
      for (const item of limitedItems) {
        const titleEl = item.querySelector('title')
        const linkEl = item.querySelector('link')
        const pubDateEl = item.querySelector('pubDate')
        const seedersEl = item.querySelector('nyaa\\:seeders') || item.querySelector('seeders')
        const leechersEl = item.querySelector('nyaa\\:leechers') || item.querySelector('leechers')
        const downloadsEl = item.querySelector('nyaa\\:downloads') || item.querySelector('downloads')

        // Pobierz magnet ze strony (przez to samo proxy)
        const pageUrl = linkEl?.textContent?.trim()
        let magnetLink = null
        if (pageUrl) {
          try {
            const proxyPageUrl = 'https://moje-proxy-nyaa.francesco1377711.workers.dev/' + new URL(pageUrl).pathname + new URL(pageUrl).search
            const pageRes = await fetch(proxyPageUrl)
            if (pageRes.ok) {
              const html = await pageRes.text()
              const magnetMatch = html.match(/<a[^>]+href="(magnet:[^"]+)"/i)
              if (magnetMatch) magnetLink = magnetMatch[1]
            }
          } catch (e) {
            console.warn('Nie udało się pobrać magnet:', e)
          }
        }

        if (!magnetLink) continue

        const hashMatch = magnetLink.match(/btih:([A-Fa-f0-9]+)/i)
        results.push({
          title: titleEl?.textContent?.trim() || 'Brak tytułu',
          link: magnetLink,
          hash: hashMatch ? hashMatch[1] : '',
          seeders: parseInt(seedersEl?.textContent || '0', 10),
          leechers: parseInt(leechersEl?.textContent || '0', 10),
          downloads: parseInt(downloadsEl?.textContent || '0', 10),
          size: 0,
          date: new Date(pubDateEl?.textContent || Date.now()),
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
      const res = await fetch(this.base + 'one%20piece')
      return res.ok
    } catch {
      return false
    }
  }
}()
