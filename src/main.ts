import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Side-effect import: initialises the Firebase app so `db` / `storage` are ready
// before any store or service touches them.
import './boot/firebase'

import './css/app.scss'

createApp(App).use(createPinia()).use(router).mount('#app')
