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
      { path: 'more', component: () => import('pages/MorePage.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes

// LibraryPage / ReaderPage are intentionally unrouted while the app is
// narrowed to memorisation + tracking. The components still exist, so
// restoring them is a matter of adding the two routes back:
//   { path: 'library', component: () => import('pages/LibraryPage.vue') },
//   { path: 'reader/:sutraId/:volumeId', component: () => import('pages/ReaderPage.vue') },
