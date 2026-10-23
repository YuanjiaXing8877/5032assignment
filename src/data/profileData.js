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
  }
})
