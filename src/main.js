import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'primeicons/primeicons.css'
import './style.css'
import { initialiseAuth } from './services/auth'

initialiseAuth().finally(() => {
  createApp(App)
    .use(router)
    .use(PrimeVue, {
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false
        }
      }
    })
    .mount('#app')
})
