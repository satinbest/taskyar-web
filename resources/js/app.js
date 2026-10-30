import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { router } from './router';
import App from './App.vue';

import AppIcon from './components/AppIcon.vue';
import { initPwa, openInstallDialog, showInstallModal } from './pwa';

const app = createApp(App);
const pinia = createPinia();

app.component('AppIcon', AppIcon);
app.use(pinia);
app.use(router);
app.mount('#app');

window.__VUE_APP__ = app;
window.__PINIA__ = pinia;
window.openInstallDialog = openInstallDialog;
window.showInstallModal = showInstallModal;

// Initialize Progressive Web App registration and events
initPwa();

