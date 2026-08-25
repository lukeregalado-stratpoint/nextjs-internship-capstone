import { requireUser } from "@/lib/auth"
import { subscribeToNotifications } from "@/lib/notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs" // needs the EventEmitter singleton, not the edge runtime

const HEARTBEAT_MS = 25_000

export async function GET(request: Request) {
  const user = await requireUser()

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false

      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      send("connected", { ok: true })

      const unsubscribe = subscribeToNotifications(user.id, (notification) => {
        send("notification", notification)
      })

      // keeps the connection alive through proxies/load balancers that drop
      // idle connections after ~30-60s, and gives the client a signal to
      // detect a dead stream.
      const heartbeat = setInterval(() => send("ping", { t: Date.now() }), HEARTBEAT_MS)

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      // fires when the client disconnects (tab closed, navigation, etc.)
      request.signal.addEventListener("abort", cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}