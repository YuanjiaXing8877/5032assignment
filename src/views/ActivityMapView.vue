<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { RouterLink } from 'vue-router'
import { activityStatus, useActivities } from '../services/activities'
import { directionsUrl, formatDuration, nearbyActivities, routeRequest } from '../utils/geo'
import { loadMaps, mapError } from '../services/maps'
import { focusTarget } from '../utils/accessibility'

const mapElement = ref(null)
const ready = ref(false)
const loading = ref(true)
const mapFailure = ref('')
const error = ref('')
const query = ref('')
const searching = ref(false)
const locating = ref(false)
const results = ref([])
const origin = ref(null)
const originLabel = ref('')
const radius = ref(10)
const activitySearch = ref('')
const selectedId = ref(null)
const mode = ref('WALKING')
const routing = ref(false)
const routeSummary = ref(null)
const routeHeading = ref(null)
const { published, error: activityLoadError } = useActivities()
const activities = computed(() => published.value.map((activity) => ({ ...activity, activity: activity.title, status: activityStatus(activity) })))
const filtered = computed(() => nearbyActivities(activities.value, origin.value, radius.value, activitySearch.value))
const selected = computed(() => filtered.value.find((activity) => activity.id === selectedId.value))
const busy = computed(() => searching.value || locating.value || routing.value)
const textDirections = computed(() => origin.value && selected.value ? directionsUrl(origin.value, selected.value.location, mode.value) : '')
let api, map, geocoder, AdvancedMarkerElement, PinElement
let markers = []
let originMarker
let polylines = []
let active = true
let requestId = 0
let searchId = 0

function clearRoute() {
  requestId++
  polylines.forEach((line) => line.setMap(null))
  polylines = []
  routeSummary.value = null
  routing.value = false
}

function fitLocations(points) {
  if (!map || !points.length) return
  const bounds = new api.LatLngBounds()
  points.forEach((point) => bounds.extend(point))
  map.fitBounds(bounds, 50)
  if (points.length === 1) map.setZoom(13)
}

function refreshMarkers() {
  if (!ready.value) return
  markers.forEach((marker) => { api.event.clearInstanceListeners(marker); marker.map = null })
  markers = filtered.value.map((activity) => {
    const pin = new PinElement({ background: activity.id === selectedId.value ? '#234e70' : '#626e7d', borderColor: '#fff', glyphColor: '#fff' })
    const marker = new AdvancedMarkerElement({ map, position: activity.location, title: `${activity.activity} — ${activity.location.label}`, content: pin.element })
    marker.addListener('click', () => chooseActivity(activity))
    return marker
  })
}

function chooseActivity(activity) {
  selectedId.value = activity.id
  if (map) { map.panTo(activity.location); map.setZoom(14) }
}

function setOrigin(point, label) {
  if (!active) return
  query.value = label
  origin.value = point
  originLabel.value = label
  results.value = []
  error.value = ''
  clearRoute()
  if (originMarker) originMarker.map = null
  const pin = new PinElement({ background: '#286fa9', borderColor: '#fff', glyphColor: '#fff' })
  originMarker = new AdvancedMarkerElement({ map, position: point, title: 'Your starting point', content: pin.element })
  fitLocations([point, ...filtered.value.map((activity) => activity.location)])
  focusTarget('#map-radius')
}

watch(query, () => {
  searchId++
  results.value = []
  origin.value = null
  originLabel.value = ''
  if (originMarker) { originMarker.map = null; originMarker = null }
  clearRoute()
}, { flush: 'sync' })

watch([selectedId, mode], () => { clearRoute(); error.value = ''; refreshMarkers() })
watch(filtered, (rows, previous = []) => {
  const before = previous.find(activity => activity.id === selectedId.value)
  if (!rows.some((activity) => activity.id === selectedId.value)) selectedId.value = rows[0]?.id ?? null
  const after = rows.find(activity => activity.id === selectedId.value)
  if (before && after && (before.location.lat !== after.location.lat || before.location.lng !== after.location.lng)) clearRoute()
  if (routeSummary.value && after) routeSummary.value.activity = after.activity
  refreshMarkers()
})

async function searchAddress() {
  if (!ready.value || busy.value || !query.value.trim()) return
  const id = ++searchId
  searching.value = true
  error.value = ''
  results.value = []
  try {
    const response = await geocoder.geocode({ address: query.value.trim(), componentRestrictions: { country: 'AU' }, bounds: { south: -38.5, west: 144.2, north: -37.1, east: 145.7 } })
    if (!active || id !== searchId) return
    results.value = response.results.slice(0, 5).map((result) => ({ id: result.place_id, label: result.formatted_address, point: result.geometry.location.toJSON() }))
    if (!results.value.length) error.value = 'No addresses found. Try a suburb, postcode or more specific street address.'
    else focusTarget('#starting-address-results button')
  } catch (failure) { if (active && id === searchId) error.value = mapError(failure) }
  finally { if (active) { searching.value = false; if (error.value) focusTarget('#map-error') } }
}

function locate() {
  if (!ready.value || busy.value) return
  error.value = ''
  if (!navigator.geolocation) { error.value = 'Location is not supported by this browser. Enter a starting address instead.'; return }
  locating.value = true
  navigator.geolocation.getCurrentPosition((position) => {
    if (!active) return
    locating.value = false
    setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude }, 'Current location')
  }, (failure) => {
    if (!active) return
    locating.value = false
    error.value = failure.code === 1 ? 'Location access was not allowed. Enter a starting address instead.' : 'Unable to find your location. Enter a starting address instead.'
  }, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false })
}

async function calculateRoute() {
  if (!ready.value || busy.value || !origin.value || !selected.value) return
  clearRoute()
  const id = requestId
  const activity = selected.value
  const travelMode = mode.value
  routing.value = true
  error.value = ''
  try {
    const { Route } = await api.importLibrary('routes')
    const response = await Route.computeRoutes(routeRequest(origin.value, activity.location, travelMode))
    if (!active || id !== requestId) return
    const route = response.routes?.[0]
    if (!route?.path?.length || !Number.isFinite(route.distanceMeters) || !Number.isFinite(route.durationMillis)) {
      error.value = 'No route is available for this journey. Try another travel mode or starting point.'
      return
    }
    polylines = route.createPolylines({ polylineOptions: { strokeColor: '#286fa9', strokeWeight: 5 } })
    polylines.forEach((line) => line.setMap(map))
    fitLocations(route.path)
    routeSummary.value = { activity: activity.activity, mode: { WALKING: 'Walking', BICYCLING: 'Cycling', DRIVING: 'Driving' }[travelMode], distance: `${(route.distanceMeters / 1000).toFixed(1)} km`, duration: formatDuration(route.durationMillis), warnings: route.warnings || [] }
    await nextTick()
    routeHeading.value?.focus()
  } catch (failure) { if (active && id === requestId) error.value = mapError(failure) }
  finally { if (active && id === requestId) { routing.value = false; if (error.value) focusTarget('#map-error') } }
}

async function initialiseMap() {
  loading.value = true
  mapFailure.value = ''
  try {
    api = await loadMaps()
    const [maps, geocoding, marker] = await Promise.all([api.importLibrary('maps'), api.importLibrary('geocoding'), api.importLibrary('marker')])
    if (!active) return
    AdvancedMarkerElement = marker.AdvancedMarkerElement
    PinElement = marker.PinElement
    geocoder = new geocoding.Geocoder()
    map = new maps.Map(mapElement.value, { center: { lat: -37.79, lng: 144.86 }, zoom: 12, mapId: 'DEMO_MAP_ID', mapTypeControl: false, streetViewControl: false, fullscreenControl: true, gestureHandling: 'cooperative' })
    ready.value = true
    refreshMarkers()
    fitLocations(filtered.value.map((activity) => activity.location))
  } catch (failure) { if (active) mapFailure.value = failure.message || mapError(failure) }
  finally { if (active) loading.value = false }
}

function handleMapAuthFailure() {
  ready.value = false
  mapFailure.value = 'The map service could not be authorised. Please try again later.'
}
onMounted(() => {
  window.addEventListener('greenlink-map-auth-failure', handleMapAuthFailure)
  initialiseMap()
})
onUnmounted(() => {
  window.removeEventListener('greenlink-map-auth-failure', handleMapAuthFailure)
  active = false
  searchId++
  clearRoute()
  markers.forEach((marker) => { api.event.clearInstanceListeners(marker); marker.map = null })
  if (originMarker) originMarker.map = null
  if (map) api.event.clearInstanceListeners(map)
})
</script>

<template>
  <main id="main-content" tabindex="-1" class="admin-page container-xl map-page">
    <section class="welcome-row"><div><p class="eyebrow">Explore your neighbourhood</p><h1>Find activities</h1><p>Find local volunteer activities and plan your journey.</p></div></section>
    <p class="sample-note">Meeting points are provided by activity coordinators. Check the activity details before travelling.</p>
    <Message v-if="activityLoadError" severity="error" :closable="false" role="alert">{{ activityLoadError }}</Message>
    <RouterLink to="/profile#browse-activities">Browse activities and manage your bookings</RouterLink>
    <Message v-if="error" id="map-error" severity="error" :closable="false" role="alert">{{ error }}</Message>
    <div class="map-layout">
      <section class="map-controls" aria-labelledby="journey-title">
        <h2 id="journey-title">Your starting point</h2>
        <form @submit.prevent="searchAddress">
          <label for="map-address">Australian address, suburb or postcode</label>
          <div class="address-search"><input id="map-address" v-model="query" class="form-control" type="search" maxlength="200" placeholder="e.g. Footscray VIC" :disabled="!ready || busy" required /><Button type="submit" class="primary-button" label="Search" :disabled="!ready || busy || !query.trim()" :loading="searching" /></div>
        </form>
        <ul v-if="results.length" id="starting-address-results" class="address-results" aria-label="Choose a starting address"><li v-for="result in results" :key="result.id"><button type="button" @click="setOrigin(result.point, result.label)">{{ result.label }}</button></li></ul>
        <p v-if="results.length" role="status">Choose an address above to set your starting point.</p>
        <Button type="button" class="outline-button location-button" label="Use my location" icon="pi pi-map-marker" outlined :disabled="!ready || busy" :loading="locating" @click="locate" />
        <p class="field-hint">Location access is optional. Address searches and route requests are sent to Google. Your location is not saved to your account.</p>
        <p v-if="origin" class="origin-note" role="status"><strong>Starting from:</strong> {{ originLabel }}</p>
        <div class="map-filter"><label for="map-radius">Distance from starting point</label><select id="map-radius" v-model.number="radius" class="form-select" :disabled="!origin || busy"><option :value="5">Within 5 km</option><option :value="10">Within 10 km</option><option :value="25">Within 25 km</option><option :value="0">Any distance</option></select><small class="field-hint">Nearby distances are straight-line estimates. Route distances follow roads and paths.</small></div>
        <div class="map-filter"><label for="map-activity-search">Search activities</label><input id="map-activity-search" v-model="activitySearch" class="form-control" type="search" placeholder="Activity or suburb" /></div>
        <h2 class="results-heading">Activities <small>({{ filtered.length }})</small></h2>
        <p class="field-hint">Use the activity buttons below to choose a destination without interacting with the map.</p>
        <p class="sr-only" role="status">{{ filtered.length }} matching activities.</p>
        <p v-if="!filtered.length" role="status">No activities match. Increase the distance or clear your activity search.</p>
        <ul class="activity-results"><li v-for="activity in filtered" :key="activity.id"><button type="button" :class="{ selected: selectedId === activity.id }" :aria-pressed="selectedId === activity.id" @click="chooseActivity(activity)"><strong>{{ activity.activity }}</strong><span>{{ activity.suburb }} · {{ activity.status }}</span><span v-if="activity.distance !== null">{{ activity.distance.toFixed(1) }} km from your starting point</span><small>{{ activity.location.label }}</small></button></li></ul>
      </section>
      <div class="map-content">
        <section class="map-panel" aria-label="Activity map">
          <p v-if="loading" class="map-loading" role="status">Loading map…</p>
          <div v-if="mapFailure" class="map-failure" role="alert"><p>{{ mapFailure }}</p><Button class="outline-button" type="button" label="Retry map" outlined @click="initialiseMap" /></div>
          <div ref="mapElement" class="google-map" role="group" :class="{ 'map-hidden': !ready }" aria-label="Interactive map of volunteer activity locations"></div>
        </section>
        <section class="journey-panel" aria-labelledby="route-title">
          <h2 id="route-title">Plan your journey</h2>
          <p v-if="selected"><strong>{{ selected.activity }}</strong><br />{{ selected.location.label }}</p>
          <p v-else>Select an activity from the list.</p>
          <form class="route-form" @submit.prevent="calculateRoute"><div><label for="map-travel-mode">Travel mode</label><select id="map-travel-mode" v-model="mode" class="form-select" :disabled="busy"><option value="WALKING">Walking</option><option value="BICYCLING">Cycling</option><option value="DRIVING">Driving</option></select></div><Button type="submit" class="primary-button" label="Get route" icon="pi pi-directions" :loading="routing" :disabled="!ready || !origin || !selected || busy" /></form>
          <p v-if="textDirections"><a :href="textDirections" target="_blank" rel="noopener noreferrer">Open directions to {{ selected.activity }} in Google Maps<span class="sr-only"> (opens a new tab)</span></a></p>
          <p v-if="!origin" class="field-hint">Search and choose a starting address, or use your location, to calculate a route.</p>
          <div v-if="routeSummary" class="route-summary" role="status"><h3 ref="routeHeading" tabindex="-1">{{ routeSummary.mode }} to {{ routeSummary.activity }}</h3><p><strong>{{ routeSummary.distance }}</strong> · About <strong>{{ routeSummary.duration }}</strong></p><p>Estimated journey time. Follow local signs and check conditions before travelling.</p><p v-for="(warning, index) in routeSummary.warnings" :key="index">{{ warning }}</p></div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.map-page h2 { font-size: 19px; }
.sample-note { padding: 12px 16px; border-left: 3px solid #967329; background: #fff9e8; color: #674e12; font-size: 13px; }
.map-layout { display: grid; grid-template-columns: minmax(280px, 350px) minmax(0, 1fr); gap: 20px; margin-top: 20px; align-items: start; }
.map-controls, .journey-panel, .map-panel { padding: 20px; border: 1px solid var(--line); border-radius: 5px; background: white; min-width: 0; }
.map-controls label, .route-form label { display: block; margin: 12px 0 7px; font-size: 13px; font-weight: 650; }
.address-search { display: flex; gap: 8px; }
.address-search input { min-width: 0; }
.address-search .p-button, .route-form .p-button { flex-shrink: 0; }
.location-button { margin: 14px 0 8px; }
.map-filter { margin-top: 16px; }
.origin-note { padding: 10px; background: #edf1f6; font-size: 13px; overflow-wrap: anywhere; }
.address-results, .activity-results { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; }
.address-results button, .activity-results button { width: 100%; border: 1px solid var(--line); border-radius: 4px; padding: 12px; background: white; text-align: left; color: var(--accent-strong); font-size: 13px; }
.address-results button:hover, .activity-results button:hover, .activity-results button.selected { background: #edf1f6; border-color: var(--accent); }
.activity-results button.selected { box-shadow: inset 3px 0 var(--accent); }
.activity-results span, .activity-results small { display: block; margin-top: 5px; color: #566273; }
.results-heading { margin: 24px 0 12px; }
.results-heading small { font-size: 14px; }
.map-content { display: grid; gap: 20px; }
.map-panel { padding: 0; overflow: hidden; }
.google-map { height: 450px; width: 100%; }
.map-hidden { height: 0; }
.map-loading, .map-failure { margin: 0; padding: 32px; }
.route-form { display: flex; flex-wrap: wrap; gap: 14px; align-items: end; }
.route-form > div { min-width: 170px; }
.route-summary { margin-top: 20px; padding: 16px; border-radius: 4px; background: #edf1f6; }
.route-summary h3 { font-size: 17px; }
.route-summary p { margin: 8px 0 0; font-size: 13px; }
button:focus-visible, h3:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
@media (max-width: 850px) { .map-layout { grid-template-columns: 1fr; } .google-map { height: 350px; } }
</style>
