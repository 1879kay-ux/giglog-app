import { supabase } from "@/lib/supabase";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

type CurrentMember = {
  loading: boolean;
  authUserId: string | null;
  memberId: string | null;
  isAdmin: boolean;

  // NEW: per-admin UI toggle (stored on band_members.admin_mode_enabled)
  adminModeEnabled: boolean;
  setAdminModeEnabled: (next: boolean) => Promise<void>;

  refresh: () => Promise<void>;
};

const CurrentMemberContext = createContext<CurrentMember>({
  loading: true,
  authUserId: null,
  memberId: null,
  isAdmin: false,

  adminModeEnabled: true,
  setAdminModeEnabled: async () => {},

  refresh: async () => {},
});

export function CurrentMemberProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // NEW
  const [adminModeEnabled, setAdminModeEnabledState] = useState(true);

  async function fetchMemberFor(authId: string | null) {
    if (!authId) {
      setMemberId(null);
      setIsAdmin(false);
      setAdminModeEnabledState(true);
      setLoading(false);
      return;
    }

    const { data: bm, error } = await supabase
      .from("band_members")
      .select("member_id,is_admin,admin_mode_enabled")
      .eq("auth_user_id", authId)
      .maybeSingle();

    if (error) {
      console.log("CurrentMember lookup error", error);
      setMemberId(null);
      setIsAdmin(false);
      setAdminModeEnabledState(true);
      setLoading(false);
      return;
    }

    setMemberId((bm?.member_id as string) ?? null);
    setIsAdmin(!!bm?.is_admin);

    // Default to true if column is null/undefined for any reason
    setAdminModeEnabledState(bm?.admin_mode_enabled ?? true);

    setLoading(false);
  }

  // NEW: persist toggle to band_members
  async function setAdminModeEnabled(next: boolean) {
    // only admins should be able to change it
    if (!isAdmin) return;
    if (!memberId) return;

    // optimistic update
    setAdminModeEnabledState(next);

    const { error } = await supabase
      .from("band_members")
      .update({ admin_mode_enabled: next })
      .eq("member_id", memberId);

    if (error) {
      // revert if save fails
      setAdminModeEnabledState(!next);
      throw error;
    }
  }

  async function refresh() {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.log("getSession error", error);

    const id = data?.session?.user?.id ?? null;
    setAuthUserId(id);
    await fetchMemberFor(id);
  }

  useEffect(() => {
    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setAuthUserId(id);
      fetchMemberFor(id);
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CurrentMemberContext.Provider
      value={{
        loading,
        authUserId,
        memberId,
        isAdmin,

        adminModeEnabled,
        setAdminModeEnabled,

        refresh,
      }}
    >
      {children}
    </CurrentMemberContext.Provider>
  );
}

export function useCurrentMember() {
  return useContext(CurrentMemberContext);
}