"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * Redirect /app/agents/[id] → /app/agents
 * The agents page uses a split-view; individual agent pages don't exist.
 * This prevents 404s from onboarding redirects and direct navigation.
 */
export default function AgentDetailRedirect() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    // The main agents page auto-selects the first agent;
    // pass the id as a search param so it can be picked up if needed.
    router.replace(`/app/agents?selected=${encodeURIComponent(id)}`);
  }, [router, id]);

  return null;
}
