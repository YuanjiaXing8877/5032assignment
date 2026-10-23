let loading

export function loadMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  if (loading) return loading
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error('The map service is currently unavailable. Please try again later.'))
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const callback = '__greenlinkMapsReady'
    const finish = (error) => {
      clearTimeout(timer)
      delete window[callback]
      if (error) { script.remove(); loading = undefined; reject(error) }
      else resolve(window.google.maps)
    }
    const timer = setTimeout(() => finish(new Error('The map took too long to load. Check your connection and try again.')), 20000)
    window[callback] = () => finish()
    window.gm_authFailure = () => {
      window.dispatchEvent(new Event('greenlink-map-auth-failure'))
      finish(new Error('The map service could not be authorised. Please try again later.'))
    }
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, loading: 'async', callback, v: 'weekly', language: 'en', region: 'AU' })}`
    script.async = true
    script.onerror = () => finish(new Error('Unable to load the map. Check your connection and try again.'))
    document.head.append(script)
  })
  return loading
}

export function mapError(error) {
  const code = String(error?.code || error?.message || '')
  if (/ZERO_RESULTS|NOT_FOUND/i.test(code)) return 'No result was found. Try a more specific Australian address or a different travel mode.'
  if (/OVER_QUERY_LIMIT|RESOURCE_EXHAUSTED|OVER_DAILY_LIMIT/i.test(code)) return 'The map service usage limit has been reached. Please try again later.'
  if (/REQUEST_DENIED|PERMISSION_DENIED|ApiNotActivated|API_KEY|authoris/i.test(code)) return 'The map service could not be authorised. Please try again later.'
  return 'Unable to complete the map request. Check your connection and try again.'
}
