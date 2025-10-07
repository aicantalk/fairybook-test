import { getServerBaseUrl } from "@/lib/server/env";
import type { GenerationTokenStatus } from "@/types";
import { CreatePageClient } from "./_components/create-page-client";

async function fetchTokenStatus(): Promise<GenerationTokenStatus | null> {
  const baseUrl = getServerBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/tokens`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { status?: GenerationTokenStatus | null };
    return payload.status ?? null;
  } catch (error) {
    console.error("Failed to fetch token status", error);
    return null;
  }
}

export const metadata = {
  title: "동화 만들기 · Fairybook Next.js",
};

export default async function CreatePage() {
  const tokenStatus = await fetchTokenStatus();
  return <CreatePageClient tokenStatus={tokenStatus} />;
}
