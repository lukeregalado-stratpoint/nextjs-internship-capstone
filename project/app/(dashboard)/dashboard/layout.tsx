import type React from "react"
import { auth } from "@clerk/nextjs/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}