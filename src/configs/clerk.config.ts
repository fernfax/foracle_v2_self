// Clerk webhook signing secret (Svix), used to verify inbound webhooks in
// app/api/webhooks/clerk. Server-only.
//
// The publishable key, secret key and sign-in/up URL vars
// (NEXT_PUBLIC_CLERK_*, CLERK_SECRET_KEY) are read directly by the Clerk SDK by
// convention, so they aren't re-exported here.
export const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
