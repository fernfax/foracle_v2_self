import { clerkSetup } from "@clerk/testing/playwright"
import { test as setup } from "@playwright/test"

// Exchanges the Clerk keys for a Testing Token so subsequent specs can sign in
// without tripping bot detection. Runs once before the auth setup.
setup("global clerk setup", async () => {
  await clerkSetup({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY
  })
})
