import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import theme from './theme'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'primeicons/primeicons.css'
import './style.css'
import { initialiseAuth } from './services/auth'

initialiseAuth().catch((error) => {
  console.error('Firebase authentication could not be initialised.', error)
}).finally(() => {
  createApp(App)
    .use(router)
    .use(PrimeVue, {
      ripple: true,
      theme: {
        preset: theme,
        options: {
          darkModeSelector: false
        }
      }
    })
    .mount('#app')
})
