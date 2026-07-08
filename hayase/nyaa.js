export default new class Nyaa {
  // Użyj darmowego, zewnętrznego API Nyaa, które zwraca JSON
  apiUrl = 'https://nyaa-api.vercel.app/api/search?q='

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`

    const url = this.apiUrl + encodeURIComponent(query)
    console.log('📡 Zapytanie do API:', url)

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) return []

      // Ogranicz do 5 wyników (dla szybkości)
      const limitedData = data.slice(0, 5)

      const results = limitedData.map(item => {
        // Wyciągnij hash z linku magnet
        const hashMatch = item.magnet?.match(/btih:([A-Fa-f0-9]+)/i)
        return {
          title: item.name || 'Brak tytułu',
          link: item.magnet || '',
          hash: hashMatch ? hashMatch[1] : '',
          seeders: item.seeders || 0,
          leechers: item.leechers || 0,
          downloads: item.downloads || 0,
          size: item.size || 0,
          date: new Date(item.date || Date.now()),
          accuracy: 'medium',
          type: 'alt'
        }
      })

      return results
    } catch (error) {
      console.error('❌ Błąd wyszukiwania:', error)
      return []
    }
  }

  async test() {
    try {
      const res = await fetch(this.apiUrl + 'one%20piece')
      return res.ok
    } catch {
      return false
    }
  }
}()
