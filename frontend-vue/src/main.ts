import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useGameDataStore } from '@/stores/gameDataStore'
import './assets/main.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Load master data using the existing gameDataStore before mounting the app
const gameDataStore = useGameDataStore(pinia);
gameDataStore.fetchGameData().then(() => {
  app.mount('#app');
  console.log('App mounted after game data has been fetched.');
}).catch(error => {
  console.error("Failed to fetch game data before mounting:", error);
  // Optionally, you can show an error message to the user on the screen here
});
