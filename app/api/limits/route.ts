import { connection } from "next/server";
import { emptyCors } from "@/lib/core/cors";
import { handleLimits } from "@/lib/core/handlers";

export async function GET(request: Request) {
  await connection();
  return handleLimits(request);
}

export async function OPTIONS(request: Request) {
  await connection();
  return emptyCors(request);
}
