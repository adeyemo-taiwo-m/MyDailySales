"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { urlBase64ToUint8Array } from "@/lib/utils";

export function usePushNotifications(businessId: string | null) {
  const supabase = createClient();

  useEffect(() => {
    if (!businessId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    registerSubscription(businessId);
  }, [businessId]);

  async function registerSubscription(bizId: string) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        // Refresh subscription in DB in case it changed
        await saveToSupabase(bizId, existing);
        return;
      }
    } catch (err) {
      console.error("Push registration failed:", err);
    }
  }

  async function saveToSupabase(bizId: string, subscription: PushSubscription) {
    await supabase.from("push_subscriptions").upsert(
      {
        business_id: bizId,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" },
    );
  }
}
export default usePushNotifications;
