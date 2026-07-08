export default new class Nyaa {
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

    const url = this.base + encodeURIComponent(query)
    
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
        // Pobieramy link do strony torrenta
        const linkEl = item.querySelector('link')
        const pageUrl = linkEl?.textContent?.trim()
        if (!pageUrl) continue

        // Pobieramy stronę torrenta, aby wyciągnąć magnet
        let magnetLink = await this.fetchMagnetFromPage(pageUrl)
        if (!magnetLink) continue // Jeśli brak magnet, pomijamy

        // Wyciągnięcie hasha z magnet
        const hashMatch = magnetLink.match(/btih:([A-Fa-f0-9]+)/i)
        const hash = hashMatch ? hashMatch[1] : ''

        results.push({
          title: item.querySelector('title')?.textContent?.trim() || 'Brak tytułu',
          link: magnetLink,
          hash: hash,
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

  // Nowa metoda do pobierania magnet ze strony torrenta
  async fetchMagnetFromPage(pageUrl) {
    try {
      const res = await fetch(pageUrl)
      if (!res.ok) return null
      const html = await res.text()
      
      // Szukamy linku magnet w HTML (użyj prostego regex)
      const magnetMatch = html.match(/<a[^>]+href="(magnet:[^"]+)"/i)
      return magnetMatch ? magnetMatch[1] : null
    } catch {
      return null
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
