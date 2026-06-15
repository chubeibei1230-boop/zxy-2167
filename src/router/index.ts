import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import TaskListPage from '@/pages/TaskListPage.vue'
import TaskDetailPage from '@/pages/TaskDetailPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/tasks',
    name: 'taskList',
    component: TaskListPage,
  },
  {
    path: '/tasks/:id',
    name: 'taskDetail',
    component: TaskDetailPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
