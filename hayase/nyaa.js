export default new class Nyaa {
  // Użyj publicznego proxy CORS
  proxy = 'https://api.allorigins.win/raw?url='
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

    // Zapytanie przez proxy
    const url = this.proxy + encodeURIComponent(this.base + encodeURIComponent(query))
    console.log('📡 Zapytanie przez proxy:', url)

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const text = await res.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'text/xml')
      
      const items = xml.querySelectorAll('item')
      if (!items.length) return []

      const results = []
      for (const item of items) {
        const pageUrl = item.querySelector('link')?.textContent?.trim()
        if (!pageUrl) continue

        // Pobierz magnet przez proxy
        const magnetLink = await this.fetchMagnetFromPage(pageUrl)
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
      console.error('❌ Błąd:', error)
      return []
    }
  }

  async fetchMagnetFromPage(pageUrl) {
    try {
      // Użyj proxy do pobrania strony
      const proxyUrl = this.proxy + encodeURIComponent(pageUrl)
      const res = await fetch(proxyUrl)
      if (!res.ok) return null
      const html = await res.text()
      const magnetMatch = html.match(/<a[^>]+href="(magnet:[^"]+)"/i)
      return magnetMatch ? magnetMatch[1] : null
    } catch {
      return null
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
