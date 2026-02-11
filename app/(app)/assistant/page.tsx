import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AssistantClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Assistant | Foracle",
  description: "Your personal AI financial assistant",
};

export default async function AssistantPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return <AssistantClient />;
}
