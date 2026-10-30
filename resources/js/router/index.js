import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '@/views/LoginPage.vue';
import RegisterPage from '@/views/RegisterPage.vue';
import WorkspaceView from '@/views/WorkspaceView.vue';
import { useAuthStore } from '@/stores/auth';

const routes = [
    {
        path: '/',
        redirect: () => {
            const authStore = useAuthStore();
            return authStore.isAuthenticated ? '/app' : '/login';
        }
    },
    {
        path: '/login',
        name: 'login',
        component: LoginPage,
        meta: { guestOnly: true }
    },
    {
        path: '/register',
        name: 'register',
        component: RegisterPage,
        meta: { guestOnly: true }
    },
    {
        path: '/app',
        name: 'workspace',
        component: WorkspaceView,
        meta: { requiresAuth: true }
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/app'
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next({ name: 'login' });
    } else if (to.meta.guestOnly && authStore.isAuthenticated) {
        next({ name: 'workspace' });
    } else {
        next();
    }
});
