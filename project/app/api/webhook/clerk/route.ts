import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

export async function POST(req: NextRequest) {
  // verify it is from Clerk
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error("Clerk webhook verification failed:", err)
    return new Response("Webhook verification failed", { status: 400 })
  }

  switch (evt.type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name } = evt.data
      const email = email_addresses[0]?.email_address

      if (!email) {
        console.error(`user.created event for ${id} has no email address`)
        break
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || email

      await db
        .insert(users)
        .values({ clerkId: id, email, name })
        .onConflictDoNothing({ target: users.clerkId })

      break
    }

    case "user.updated": {
      const { id, email_addresses, first_name, last_name } = evt.data
      const email = email_addresses[0]?.email_address
      const name = [first_name, last_name].filter(Boolean).join(" ") || email

      await db
        .update(users)
        .set({ email, name, updatedAt: new Date() })
        .where(eq(users.clerkId, id))

      break
    }

    case "user.deleted": {
      const { id } = evt.data
      if (id) {
        await db.delete(users).where(eq(users.clerkId, id))
      }
      break
    }

    default:
      break
  }

  return new Response("OK", { status: 200 })
}