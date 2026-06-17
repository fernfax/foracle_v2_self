import { redirect } from "next/navigation"
import { getSinglishMode } from "@/actions/singlish-mode"
import { auth } from "@clerk/nextjs/server"

import { AssistantClient } from "@/app/(app)/assistant/client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "AI Assistant | Foracle",
  description: "Your personal AI financial assistant"
}

export default async function AssistantPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const singlishMode = await getSinglishMode()

  return <AssistantClient initialSinglishMode={singlishMode} />
}
