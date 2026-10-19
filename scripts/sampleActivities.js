import { activityTimeInput, parseActivityTime } from '../src/utils/activityTime.js'
import { validateActivity } from '../functions/activities.js'

// Public meeting points checked against council listings. These are sample sessions,
// not announcements made on behalf of the parks or councils.
export const meetingPoints = {
  buckingham: {
    suburb: 'Sunshine West',
    address: 'Buckingham Reserve, 2A Buckingham Crescent, Sunshine West VIC 3020, Australia',
    location: { lat: -37.799181, lng: 144.8288571 },
    source: 'https://directory.brimbank.vic.gov.au/buckingham-reserve/'
  },
  footscray: {
    suburb: 'Footscray',
    address: 'Footscray Park, Ballarat Road, Footscray VIC 3011, Australia',
    location: { lat: -37.793124, lng: 144.895923 },
    source: 'https://www.maribyrnong.vic.gov.au/Park/Footscray-Park'
  },
  yarraville: {
    suburb: 'Yarraville',
    address: 'Yarraville Gardens, 139–147 Hyde Street, Yarraville VIC 3013, Australia',
    location: { lat: -37.8141514, lng: 144.8984289 },
    source: 'https://www.maribyrnong.vic.gov.au/Park/Yarraville-Gardens-Precinct'
  }
}

export function buildSampleActivities(now = Date.now()) {
  const today = new Date(`${activityTimeInput(now).slice(0, 10)}T00:00:00Z`)
  let daysToSaturday = (6 - today.getUTCDay() + 7) % 7
  if (daysToSaturday < 5) daysToSaturday += 7
  const sessions = [
    ['shade-corridor', 'Shade Corridor Planting', 'buckingham', 0, 3, 24, 'Learn how local shade corridors support cooler neighbourhoods and practise planting and mulching techniques.'],
    ['kororoit-creek', 'Kororoit Creek Care Day', 'buckingham', 1, 2, 18, 'Explore creek care, litter collection and habitat protection along the Kororoit Creek Trail.'],
    ['pollinator-garden', 'Pollinator Garden Working Bee', 'footscray', 7, 2, 16, 'Learn about pollinator-friendly plants, garden maintenance and simple ways to support native insects.'],
    ['river-litter-walk', 'Maribyrnong River Litter Walk', 'footscray', 8, 2, 20, 'Meet other volunteers for a riverside walk and learn how to sort and record collected litter.'],
    ['native-seedlings', 'Native Seedling Care Morning', 'yarraville', 14, 2, 12, 'Practise seedling care, watering and recognising common native plants with a small volunteer group.'],
    ['community-garden', 'Community Garden Care Day', 'yarraville', 15, 3, 20, 'Share gardening skills and learn about seasonal maintenance, composting and working safely outdoors.']
  ]
  return sessions.map(([key, title, pointKey, offset, hours, capacity, details]) => {
    const day = new Date(today)
    day.setUTCDate(day.getUTCDate() + daysToSaturday + offset)
    const startAt = parseActivityTime(`${day.toISOString().slice(0, 10)}T10:00`)
    const point = meetingPoints[pointKey]
    return {
      id: `sample-${key}-v1`,
      ...validateActivity({
        title, description: `Sample volunteer session with bookings enabled. Confirm arrangements with the coordinator before attending. ${details}`,
        suburb: point.suburb, address: point.address, location: point.location,
        startAt, endAt: startAt + hours * 3600000, capacity
      }, now),
      locationSource: point.source
    }
  })
}
