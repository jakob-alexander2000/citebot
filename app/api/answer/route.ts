import { connection } from "next/server";
import { emptyCors } from "@/lib/core/cors";
import { handleAnswer } from "@/lib/core/handlers";

export async function POST(request: Request) {
  await connection();
  return handleAnswer(request);
}

export async function OPTIONS(request: Request) {
  await connection();
  return emptyCors(request);
}
