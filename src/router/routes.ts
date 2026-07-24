import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/HomePage.vue') },
      { path: 'practice', component: () => import('pages/PracticePage.vue') },
      { path: 'dedication', component: () => import('pages/DedicationPage.vue') },
      { path: 'collection', component: () => import('pages/CollectionPage.vue') },
      { path: 'pureland', component: () => import('pages/PureLandPage.vue') },
      { path: 'achievements', component: () => import('pages/AchievementsPage.vue') },
      { path: 'library', component: () => import('pages/LibraryPage.vue') },
      { path: 'reader/:sutraId/:volumeId', component: () => import('pages/ReaderPage.vue') },
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'more', component: () => import('pages/MorePage.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
