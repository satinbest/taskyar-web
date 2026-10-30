<template>
  <router-view />
  <PwaBanner />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import PwaBanner from '@/components/PwaBanner.vue';

const authStore = useAuthStore();

onMounted(() => {
  // Ensure user theme is initialized on page load
  authStore.applyTheme(authStore.theme);
});
</script>
