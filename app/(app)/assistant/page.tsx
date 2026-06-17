import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { getSinglishMode } from "@/lib/actions/singlish-mode"

import { AssistantClient } from "./client"

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
