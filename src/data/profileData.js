import { reactive } from 'vue'

export const profileData = reactive({
  user: {
    name: 'Mei Chen',
    email: 'mei.chen@example.com',
    phone: '0412 345 678',
    gender: 'Female',
    suburb: 'Footscray',
    language: 'English',
    role: 'Volunteer',
    joined: '18 August 2026',
    emailUpdates: 'Subscribed'
  },
  activities: [
    { id: 1, date: '22 Aug 2026', activity: 'Shade Corridor Planting', suburb: 'Sunshine West', status: 'Confirmed', hours: 3, trees: 7 },
    { id: 2, date: '30 Aug 2026', activity: 'Kororoit Creek Care Day', suburb: 'Albion', status: 'Saved', hours: 0, trees: 0 },
    { id: 3, date: '12 Jul 2026', activity: 'Pollinator Garden Working Bee', suburb: 'Footscray', status: 'Completed', hours: 2, trees: 5 }
  ]
})
