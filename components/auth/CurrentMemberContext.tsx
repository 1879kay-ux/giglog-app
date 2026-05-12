import { savePushToken } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

type CurrentMember = {
  loading: boolean;
  authUserId: string | null;
  memberId: string | null;
  bandId: string | null;

  isAdmin: boolean;

  // per-admin UI toggle (stored on band_members.admin_mode_enabled)
  adminModeEnabled: boolean;
  setAdminModeEnabled: (next: boolean) => Promise<void>;

  // NEW: per-member visibility flags (stored on band_members)
  canViewFinance: boolean;
  canViewBandDocs: boolean;
  canViewBandAndCrew: boolean;
  canViewSettings: boolean;

  refresh: () => Promise<void>;
};

const CurrentMemberContext = createContext<CurrentMember>({
  loading: true,
  authUserId: null,
  memberId: null,
  bandId: null,

  isAdmin: false,

  adminModeEnabled: true,
  setAdminModeEnabled: async () => {},

  canViewFinance: false,
  canViewBandDocs: false,
  canViewBandAndCrew: false,
  canViewSettings: false,

  refresh: async () => {},
});

export function CurrentMemberProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [bandId, setBandId] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [adminModeEnabled, setAdminModeEnabledState] = useState(true);

  const [canViewFinance, setCanViewFinance] = useState(false);
  const [canViewBandDocs, setCanViewBandDocs] = useState(false);
  const [canViewBandAndCrew, setCanViewBandAndCrew] = useState(false);
  const [canViewSettings, setCanViewSettings] = useState(false);

  async function fetchMemberFor(authId: string | null) {
    if (!authId) {
      setMemberId(null);
      setBandId(null);
      setIsAdmin(false);

      setAdminModeEnabledState(true);

      setCanViewFinance(false);
      setCanViewBandDocs(false);
      setCanViewBandAndCrew(false);
      setCanViewSettings(false);

      setLoading(false);
      return;
    }

    const { data: bm, error } = await supabase
      .from("band_members")
      .select(
        [
          "member_id",
          "band_id",
          "is_admin",
          "admin_mode_enabled",
          "can_view_finance",
          "can_view_band_docs",
          "can_view_band_and_crew",
          "can_view_settings",
        ].join(",")
      )
      .eq("auth_user_id", authId)
      .maybeSingle();

    if (error) {
      console.log("CurrentMember lookup error", error);

      setMemberId(null);
      setBandId(null);
      setIsAdmin(false);

      setAdminModeEnabledState(true);

      setCanViewFinance(false);
      setCanViewBandDocs(false);
      setCanViewBandAndCrew(false);
      setCanViewSettings(false);

      setLoading(false);
      return;
    }

    const member_id = (bm as any)?.member_id ?? null;
const band_id = (bm as any)?.band_id ?? null;
const admin = !!(bm as any)?.is_admin;

setMemberId(member_id);
setBandId(band_id);
setIsAdmin(admin);

if (band_id) {
  savePushToken(authId, band_id);
}

    // default to true if null (safety for older rows)
    setAdminModeEnabledState((bm as any)?.admin_mode_enabled ?? true);

    // If admin, treat all as true (simple rule; also matches the SQL update you ran)
    if (admin) {
      setCanViewFinance(true);
      setCanViewBandDocs(true);
      setCanViewBandAndCrew(true);
      setCanViewSettings(true);
    } else {
      setCanViewFinance(!!(bm as any)?.can_view_finance);
      setCanViewBandDocs(!!(bm as any)?.can_view_band_docs);
      setCanViewBandAndCrew(!!(bm as any)?.can_view_band_and_crew);
      setCanViewSettings(!!(bm as any)?.can_view_settings);
    }

    setLoading(false);
  }

  async function setAdminModeEnabled(next: boolean) {
    if (!isAdmin) return;
    if (!memberId) return;

    setAdminModeEnabledState(next);

    const { error } = await supabase
      .from("band_members")
      .update({ admin_mode_enabled: next })
      .eq("member_id", memberId);

    if (error) {
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
        bandId,

        isAdmin,

        adminModeEnabled,
        setAdminModeEnabled,

        canViewFinance,
        canViewBandDocs,
        canViewBandAndCrew,
        canViewSettings,

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