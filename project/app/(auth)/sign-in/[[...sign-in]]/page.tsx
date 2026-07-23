// TODO: Task 2.3 - Create sign-in and sign-up pages
import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-platinum-900 dark:bg-outer_space-600 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500 mb-2">Welcome Back</h1>
          <p className="text-paynes_gray-500 dark:text-french_gray-400">Sign in to your project management account</p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white dark:bg-outer_space-500 border border-french_gray-300 dark:border-paynes_gray-400 shadow-lg",
            },
          }}
        />
      </div>
    </div>
  )
}

/*
TODO: Task 2.3 Implementation Notes:
- Import SignIn from @clerk/nextjs
- Configure sign-in redirects
- Style to match design system
- Add proper error handling
*/
