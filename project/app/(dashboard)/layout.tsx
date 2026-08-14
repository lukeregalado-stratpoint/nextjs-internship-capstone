import type React from "react"
import { auth } from "@clerk/nextjs/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { getOrCreateCurrentUser } from "@/lib/auth"

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await auth.protect()

  await getOrCreateCurrentUser()
  return <DashboardLayout><div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div></DashboardLayout>
}

