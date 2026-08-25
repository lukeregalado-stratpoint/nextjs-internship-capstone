// todo: task 5.3 - set up client-side state management with zustand

/*
TODO: Implementation Notes for Interns:

UI state management store for:
- Modal states (create project, create task, etc.)
- Sidebar state
- Theme preferences
- Loading states
- Error states
- Notifications/toasts

Install: pnpm add zustand

Example structure:
import { create } from 'zustand'

interface UIState {
  // modal states
  isCreateProjectModalOpen: boolean
  isCreateTaskModalOpen: boolean
  isTaskDetailModalOpen: boolean
  selectedTaskId: string | null

  // ui states
  sidebarOpen: boolean
  theme: 'light' | 'dark'

  // loading states
  isLoading: boolean
  loadingMessage: string

  // actions
  openCreateProjectModal: () => void
  closeCreateProjectModal: () => void
  openCreateTaskModal: () => void
  closeCreateTaskModal: () => void
  openTaskDetailModal: (taskId: string) => void
  closeTaskDetailModal: () => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setLoading: (loading: boolean, message?: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  // ... implementation
}))
*/

// placeholder to prevent import errors
export const useUIStore = () => {
  console.log("TODO: Implement UI store with Zustand")
  return {
    isCreateProjectModalOpen: false,
    isCreateTaskModalOpen: false,
    openCreateProjectModal: () => console.log("TODO: Open create project modal"),
    closeCreateProjectModal: () => console.log("TODO: Close create project modal"),
  }
}
