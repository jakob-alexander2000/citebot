import { connection } from "next/server";
import { emptyCors } from "@/lib/core/cors";
import { handleChat } from "@/lib/core/chat-bridge";

export async function POST(request: Request) {
  await connection();
  return handleChat(request);
}

export async function OPTIONS(request: Request) {
  await connection();
  return emptyCors(request);
}
