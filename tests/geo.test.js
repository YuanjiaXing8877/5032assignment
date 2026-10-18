import test from 'node:test'
import assert from 'node:assert/strict'
import { distanceKm, nearbyActivities, routeRequest, formatDuration } from '../src/utils/geo.js'
const origin = { lat: -37.8, lng: 144.9 }
const activities = [
 { id: 1, activity: 'Tree planting', suburb: 'Sunshine West', location: { lat: -37.797, lng: 144.816 } },
 { id: 2, activity: 'Garden care', suburb: 'Footscray', location: { lat: -37.8, lng: 144.899 } },
 { id: 3, activity: 'No location', suburb: 'Albion' }
]
test('distance is symmetric, zero for identical points and measured in kilometres', () => {
 assert.equal(distanceKm(origin, origin), 0)
 assert.ok(Math.abs(distanceKm({lat:0,lng:0},{lat:0,lng:1}) - 111.195) < 0.01)
 assert.ok(Math.abs(distanceKm(origin,activities[0].location)-distanceKm(activities[0].location,origin)) < 0.000001)
})
test('nearby activities combine keyword and radius filters, sort by distance and preserve source', () => {
 assert.deepEqual(nearbyActivities(activities,origin,5).map(a=>a.id), [2])
 assert.deepEqual(nearbyActivities(activities,origin,10).map(a=>a.id), [2,1])
 assert.deepEqual(nearbyActivities(activities,origin,10,' SUNSHINE ').map(a=>a.id), [1])
 assert.equal(nearbyActivities(activities,null,5).length,2)
 assert.equal(activities[0].distance, undefined)
})
test('route request uses selected mode, essential fields and no traffic-aware option', () => {
 for(const mode of ['WALKING','BICYCLING','DRIVING']) {
  const request=routeRequest(origin,activities[0].location,mode)
  assert.equal(request.travelMode, mode)
  assert.ok(request.fields.includes('path') && request.fields.includes('distanceMeters') && request.fields.includes('durationMillis'))
  assert.equal(request.routingPreference, mode==='DRIVING' ? 'TRAFFIC_UNAWARE' : undefined)
 }
 assert.throws(()=>routeRequest(origin,origin,'INVALID'))
})
test('journey estimates format rounded-up minutes and hours', () => {
 assert.equal(formatDuration(61000),'2 min')
 assert.equal(formatDuration(3900000),'1 hr 5 min')
})
