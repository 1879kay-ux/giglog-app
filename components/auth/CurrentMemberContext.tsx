import { supabase } from "@/lib/supabase";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

type CurrentMember = {
  loading: boolean;
  authUserId: string | null;
  memberId: string | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
};

const CurrentMemberContext = createContext<CurrentMember>({
  loading: true,
  authUserId: null,
  memberId: null,
  isAdmin: false,
  refresh: async () => {},
});

export function CurrentMemberProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function fetchMemberFor(authId: string | null) {
    if (!authId) {
      setMemberId(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data: bm, error } = await supabase
      .from("band_members")
      .select("member_id,is_admin")
      .eq("auth_user_id", authId)
      .maybeSingle();

    if (error) {
      console.log("CurrentMember lookup error", error);
      setMemberId(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setMemberId((bm?.member_id as string) ?? null);
    setIsAdmin(!!bm?.is_admin);
    setLoading(false);
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