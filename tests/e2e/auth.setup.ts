import { setupClerkTestingToken } from "@clerk/testing/playwright"
import { expect, test as setup } from "@playwright/test"

const authFile = "tests/e2e/.auth/user.json"

// Mint a Clerk sign-in token (ticket) for the e2e user via the Backend API.
// This is the robust E2E path: it sidesteps password entry, CAPTCHA, and the
// dev-instance handshake that makes clerk.signIn() flaky.
async function createSignInTicket(
  email: string,
  secretKey: string
): Promise<string> {
  const usersRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  )
  const users = (await usersRes.json()) as Array<{ id: string }>
  const userId = users?.[0]?.id
  if (!userId) throw new Error(`No Clerk user found for ${email}`)

  const tokenRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ user_id: userId })
  })
  const body = (await tokenRes.json()) as { token?: string }
  if (!body.token) {
    throw new Error(
      `sign_in_tokens failed: ${JSON.stringify(body).slice(0, 200)}`
    )
  }
  return body.token
}

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!email || !secretKey) {
    throw new Error("E2E_CLERK_USER_EMAIL / CLERK_SECRET_KEY must be set")
  }

  const ticket = await createSignInTicket(email, secretKey)
  await setupClerkTestingToken({ page })
  // The app's <SignIn> consumes __clerk_ticket and establishes a session,
  // then redirects away from /sign-in.
  await page.goto(`/sign-in?__clerk_ticket=${ticket}`)
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 30000
  })
  await expect(
    page,
    "ticket sign-in did not establish a session"
  ).not.toHaveURL(/\/sign-in/)
  await page.context().storageState({ path: authFile })
})
