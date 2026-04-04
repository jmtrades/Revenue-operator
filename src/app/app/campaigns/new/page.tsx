"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CampaignsNewRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/app/campaigns/create${params ? `?${params}` : ""}`);
  }, [router, searchParams]);
  return null;
}
