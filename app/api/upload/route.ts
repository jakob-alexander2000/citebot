import { connection } from "next/server";
import { emptyCors } from "@/lib/core/cors";
import { handleUpload, handleUploadDelete } from "@/lib/core/handlers";

export async function POST(request: Request) {
  await connection();
  return handleUpload(request);
}

export async function DELETE(request: Request) {
  await connection();
  return handleUploadDelete(request);
}

export async function OPTIONS(request: Request) {
  await connection();
  return emptyCors(request);
}
