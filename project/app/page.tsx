import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark">
      <Header />
      <Hero />
      <Features />

      <Footer />
    </div>
  )
}