import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  userId: string;
  email: string;
};

const signInPath = "/signin-with-chatgpt";

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");

  if (userId && email) return { userId, email };

  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : "/front";
  redirect(`${signInPath}?return_to=${encodeURIComponent(safeReturnTo)}`);
}
