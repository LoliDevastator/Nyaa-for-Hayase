export default new class Nyaa {
  // URL do RSS Nyaa
  base = 'https://nyaa.si/?page=rss&q='

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    // Budowanie zapytania
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`

    const url = this.base + encodeURIComponent(query)
    
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const text = await res.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'text/xml')
      
      // Sprawdzenie błędów parsowania
      const parserError = xml.querySelector('parsererror')
      if (parserError) throw new Error('Błąd parsowania XML')

      // Pobranie wszystkich elementów <item>
      const items = xml.querySelectorAll('item')
      if (!items.length) return []

      const results = []

      for (const item of items) {
        // Pobranie podstawowych danych
        const titleEl = item.querySelector('title')
        const linkEl = item.querySelector('link')
        const pubDateEl = item.querySelector('pubDate')
        
        // Nyaa używa własnej przestrzeni nazw (nyaa:)
        const seedersEl = item.querySelector('nyaa\\:seeders') || item.querySelector('seeders')
        const leechersEl = item.querySelector('nyaa\\:leechers') || item.querySelector('leechers')
        const downloadsEl = item.querySelector('nyaa\\:downloads') || item.querySelector('downloads')
        const sizeEl = item.querySelector('nyaa\\:size') || item.querySelector('size')
        const hashEl = item.querySelector('nyaa\\:infoHash') || item.querySelector('infoHash')

        // Pobranie linku magnet (jeśli jest w <link>) lub z <nyaa:magnet>
        let magnetLink = linkEl?.textContent?.trim() || ''
        // Jeśli link prowadzi do strony, spróbuj znaleźć magnet w <nyaa:magnet>
        if (!magnetLink.startsWith('magnet:')) {
          const magnetEl = item.querySelector('nyaa\\:magnet') || item.querySelector('magnet')
          if (magnetEl) magnetLink = magnetEl.textContent?.trim() || ''
        }

        // Jeśli nadal brak magnet, pomiń wynik
        if (!magnetLink.startsWith('magnet:')) continue

        // Wyciągnięcie hasha z magnet linku
        const hashMatch = magnetLink.match(/btih:([A-Fa-f0-9]+)/i)
        const hash = hashMatch ? hashMatch[1] : ''

        results.push({
          title: titleEl?.textContent?.trim() || 'Brak tytułu',
          link: magnetLink,
          hash: hash,
          seeders: parseInt(seedersEl?.textContent || '0', 10),
          leechers: parseInt(leechersEl?.textContent || '0', 10),
          downloads: parseInt(downloadsEl?.textContent || '0', 10),
          size: 0, // Nyaa podaje rozmiar w formacie np. "1.2 GiB", można to przeliczyć na bajty
          date: new Date(pubDateEl?.textContent || Date.now()),
          accuracy: 'medium',
          type: 'alt'
        })
      }

      return results
    } catch (error) {
      console.error('Błąd wyszukiwania Nyaa:', error)
      return [] // Zwróć pustą tablicę w przypadku błędu
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
