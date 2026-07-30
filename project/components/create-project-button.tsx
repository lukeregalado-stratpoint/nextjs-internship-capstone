"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { CreateProjectModal } from "@/components/modals/create-project-modal"

export function CreateProjectButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-lavender-500 text-white rounded-xl hover:bg-lavender-600 transition-colors
                  cursor-pointer"
      >
        <Plus size={20} className="mr-2" />
        New Project
      </button>
      <CreateProjectModal open={open} onOpenChange={setOpen} />
    </>
  )
}