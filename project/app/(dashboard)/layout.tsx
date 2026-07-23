import type React from "react"
import { auth } from "@clerk/nextjs/server"
import { DashboardLayout } from "@/components/dashboard-layout"

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await auth.protect()
  return <DashboardLayout><>{children}</></DashboardLayout>
}