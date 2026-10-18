export function distanceKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180
  const lat = radians(to.lat - from.lat)
  const lng = radians(to.lng - from.lng)
  const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

export function nearbyActivities(activities, origin, radius, query = '') {
  const search = query.trim().toLowerCase()
  return activities
    .filter((activity) => activity.location && `${activity.activity} ${activity.suburb}`.toLowerCase().includes(search))
    .map((activity) => ({ ...activity, distance: origin ? distanceKm(origin, activity.location) : null }))
    .filter((activity) => !origin || !radius || activity.distance <= radius)
    .sort((a, b) => origin ? a.distance - b.distance : String(a.id).localeCompare(String(b.id), 'en', { numeric: true }))
}

export function routeRequest(origin, destination, mode) {
  if (!['WALKING', 'BICYCLING', 'DRIVING'].includes(mode)) throw new Error('Choose a supported travel mode.')
  return {
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng }, travelMode: mode,
    ...(mode === 'DRIVING' ? { routingPreference: 'TRAFFIC_UNAWARE' } : {}),
    fields: ['path', 'distanceMeters', 'durationMillis', 'warnings'],
    language: 'en-AU'
  }
}

export function formatDuration(milliseconds) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min` : `${minutes} min`
}
