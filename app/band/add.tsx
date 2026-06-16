import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MEMBER_TYPES = ["musician", "crew"] as const;
type MemberType = (typeof MEMBER_TYPES)[number];

const MUSICIAN_ROLES = ["Band", "Dep Musician", "Other"] as const;
type MusicianRole = (typeof MUSICIAN_ROLES)[number];

const CREW_ROLES = [
  "Crew",
  "Tour Manager",
  "Merch",
  "FoH Engineer",
  "Monitor Engineer",
  "Lighting",
  "Tech",
  "Other",
] as const;
type CrewRole = (typeof CREW_ROLES)[number];

const CAPABILITY_CATEGORY_ORDER = [
  "performance",
  "crew",
  "logistics",
  "business",
  "creative_specialist",
  "other",
] as const;
type CapabilityCategory = (typeof CAPABILITY_CATEGORY_ORDER)[number];

const CREW_ROLE_SET = new Set<string>([
  "Crew",
  "Tour Manager",
  "Merch",
  "FoH Engineer",
  "Monitor Engineer",
  "Lighting",
  "Tech",
]);

type CapabilityChip = {
  capability_id: string;
  name: string;
  category: CapabilityCategory;
};

type InviteResponse =
  | {
      ok: true;
      member_id: string;
      auth_user_id: string;
      invite_sent: boolean;
      note?: string;
    }
  | {
      ok?: false;
      error?: string;
      details?: string;
    };

export default function AddBandMemberScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();

  const cm: any = useCurrentMember();
  const currentUserIsAdmin = !!cm?.isAdmin;

  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [memberType, setMemberType] = useState<MemberType>("musician");

  // role handling
  const [musicianRole, setMusicianRole] = useState<MusicianRole>("Band");
  const [crewRole, setCrewRole] = useState<CrewRole>("Crew");
  const [roleOther, setRoleOther] = useState("");

  const [isActive, setIsActive] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // access toggles
  const [canViewSettings, setCanViewSettings] = useState(false);
  const [canViewBandAndCrew, setCanViewBandAndCrew] = useState(false);
  const [canViewBandDocs, setCanViewBandDocs] = useState(false);
  const [canViewFinance, setCanViewFinance] = useState(false);
  const [bandId, setBandId] = useState<string | null>(null);
  const [loadedCapabilities, setLoadedCapabilities] = useState<CapabilityChip[]>([]);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] =  useState<Set<CapabilityCategory>>(new Set(["performance"]));

  const role = useMemo(() => {
    return memberType === "musician" ? musicianRole : crewRole;
  }, [memberType, musicianRole, crewRole]);

  const toggleCapability = (capabilityId: string) => {
    setSelectedCapabilityIds((prev) =>
      prev.includes(capabilityId)
        ? prev.filter((id) => id !== capabilityId)
        : [...prev, capabilityId],
    );
  };

  const toggleCategoryExpanded = (category: CapabilityCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  useEffect(() => {
    let alive = true;

    const loadCapabilities = async () => {
      const currentBandId = await getCurrentBandId();
      if (!alive) return;

      setBandId(currentBandId);

      if (!currentBandId) {
        setLoadedCapabilities([]);
        setSelectedCapabilityIds([]);
        setExpandedCategories(new Set<CapabilityCategory>(["performance"]),);
        return;
      }

      const { data, error } = await supabase
        .from("capabilities")
        .select("capability_id,name,category")
        .eq("band_id", currentBandId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!alive) return;

      if (error) {
        console.log("load capabilities catalogue error", error);
        setLoadedCapabilities([]);
        return;
      }

      const nextCapabilities = ((data ?? []) as any[])
        .filter(
          (item) =>
            item?.capability_id &&
            item?.name &&
            CAPABILITY_CATEGORY_ORDER.includes(item?.category as CapabilityCategory),
        )
        .map((item) => ({
          capability_id: item.capability_id as string,
          name: item.name as string,
          category: item.category as CapabilityCategory,
        }));
      setLoadedCapabilities(nextCapabilities);
    };

    loadCapabilities();
    return () => {
      alive = false;
    };
  }, []);

  async function getCurrentBandId(): Promise<string | null> {
    const { data: sessionData, error: sessionErr } =
      await supabase.auth.getSession();
    if (sessionErr) {
      console.log("getSession error", sessionErr);
      return null;
    }

    const authUserId = sessionData?.session?.user?.id;
    if (!authUserId) return null;

    const { data: bm, error: bmErr } = await supabase
      .from("band_members")
      .select("band_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (bmErr) {
      console.log("band_members band_id lookup error", bmErr);
      return null;
    }

    return (bm?.band_id as string) ?? null;
  }

  const onSave = async () => {
    if (!currentUserIsAdmin) {
      Alert.alert(
        i18n.t("bandAdd.alert.notAllowedTitle"),
        i18n.t("bandAdd.alert.onlyAdminsCanInvite"),
      );
      return;
    }

    const name = displayName.trim();
    if (!name) {
      Alert.alert(
        i18n.t("bandAdd.alert.missingNameTitle"),
        i18n.t("bandAdd.alert.pleaseEnterDisplayName"),
      );
      return;
    }

    const emailClean = email.trim();
    if (!emailClean) {
      Alert.alert(
        i18n.t("bandAdd.alert.missingEmailTitle"),
        i18n.t("bandAdd.alert.pleaseEnterEmailAddress"),
      );
      return;
    }

    if (role === "Other" && !roleOther.trim()) {
      Alert.alert(
        i18n.t("bandAdd.alert.missingRoleTitle"),
        i18n.t("bandAdd.alert.pleaseEnterRoleOther"),
      );
      return;
    }

    const finalMemberType: MemberType = CREW_ROLE_SET.has(role)
      ? "crew"
      : memberType;
    const finalPositions: string[] = [];
    const finalPositionsOther: string[] = [];

    setSaving(true);

    try {
      const currentBandId = bandId ?? (await getCurrentBandId());
      if (!currentBandId) {
        Alert.alert(
          i18n.t("bandAdd.alert.errorTitle"),
          i18n.t("bandAdd.alert.noBandIdFoundForCurrentUser"),
        );
        return;
      }

      if (!bandId) setBandId(currentBandId);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken)
        throw new Error("No session token - please sign in again.");

      const apikey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!apikey)
        throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in app runtime");

      const url =
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/invite-band-member` +
        `?apikey=${encodeURIComponent(apikey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          band_id: currentBandId,
          display_name: name,
          email: emailClean,
          phone: phone.trim() || null,
          member_type: finalMemberType,
          is_active: isActive,
          is_admin: isAdmin,
          band_role: role,
          band_role_other: role === "Other" ? roleOther.trim() : null,
          is_dep: finalMemberType === "musician" && role === "Dep Musician",
          band_positions: finalPositions,
          band_positions_other: finalPositionsOther,

          // access
          can_view_settings: canViewSettings,
          can_view_band_and_crew: canViewBandAndCrew,
          can_view_band_docs: canViewBandDocs,
          can_view_finance: canViewFinance,
        }),
      });

      const text = await res.text();
      console.log("invite-band-member fetch status", res.status);
      console.log("invite-band-member fetch body", text);

      let data: InviteResponse;
      try {
        data = JSON.parse(text) as InviteResponse;
      } catch {
        throw new Error(text || "Edge Function returned non-JSON response");
      }

      if (!res.ok || !("ok" in data) || data.ok !== true) {
        const msg =
          (data as any)?.details ??
          (data as any)?.error ??
          text ??
          "Invite failed";
        throw new Error(msg);
      }

      // Patch remaining UI-only fields if you still want (safe no-op updates)
      const patch: any = {
        band_role: role,
        band_role_other: role === "Other" ? roleOther.trim() || null : null,
        phone: phone.trim() || null,
        band_positions: finalPositions,
        band_positions_other: finalPositionsOther,
        is_active: isActive,
        is_admin: isAdmin,
        is_dep: finalMemberType === "musician" && role === "Dep Musician",

        // access
        can_view_settings: canViewSettings,
        can_view_band_and_crew: canViewBandAndCrew,
        can_view_band_docs: canViewBandDocs,
        can_view_finance: canViewFinance,
      };

      const { error: patchErr } = await supabase
        .from("band_members")
        .update(patch)
        .eq("member_id", data.member_id);

      if (patchErr) throw new Error(patchErr.message);

      if (selectedCapabilityIds.length > 0) {
        const capabilityRows = selectedCapabilityIds.map((capabilityId) => ({
          member_id: data.member_id,
          capability_id: capabilityId,
        }));

        const { error: insertCapabilitiesError } = await supabase
          .from("person_capabilities")
          .insert(capabilityRows);

        if (insertCapabilitiesError) {
          throw new Error(insertCapabilitiesError.message);
        }
      }

      Alert.alert(
        i18n.t("bandAdd.alert.inviteSentTitle"),
        data.note ??
          (data.invite_sent
            ? i18n.t("bandAdd.alert.inviteEmailSent")
            : i18n.t("bandAdd.alert.memberCreated")),
      );
      router.back();
    } catch (e: any) {
      console.log("invite member error", e);
      Alert.alert(i18n.t("bandAdd.alert.errorTitle"), String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const rolesToRender = memberType === "musician" ? MUSICIAN_ROLES : CREW_ROLES;
  const selectedRole = role;

  const capabilityCategoryLabel = (category: CapabilityCategory) => {
    if (category === "performance") return i18n.t("people.category.performance");
    if (category === "crew") return i18n.t("people.category.crew");
    if (category === "logistics") return i18n.t("people.category.logistics");
    if (category === "business") return i18n.t("people.category.business");
    if (category === "creative_specialist") {
      return i18n.t("people.category.creativeSpecialist");
    }
    return i18n.t("people.category.other");
  };

  const groupedCapabilities = CAPABILITY_CATEGORY_ORDER
    .map((category) => ({
      category,
      items: loadedCapabilities.filter((capability) => capability.category === category),
    }))
    .filter((group) => group.items.length > 0);

  const ToggleChip = (props: {
    label: string;
    value: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => {
    const on = !!props.value;
    return (
      <Pressable
        onPress={props.onPress}
        disabled={props.disabled}
        style={[
          styles.chip,
          on && styles.chipSelected,
          props.disabled ? { opacity: 0.5 } : null,
        ]}
      >
        <Text style={[styles.chipText, on && styles.chipTextSelected]}>
          {props.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: i18n.t("people.addTitle") }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.label}>{i18n.t("bandAdd.name")}</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={i18n.t("bandAdd.placeholderName")}
            style={styles.input}
          />

          <Text style={styles.label}>{i18n.t("bandAdd.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={i18n.t("bandAdd.placeholderEmail")}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>{i18n.t("people.phone")}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={i18n.t("people.placeholderPhone")}
            autoCapitalize="none"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>{i18n.t("people.capabilities")}</Text>
          {groupedCapabilities.length === 0 ? (
            <Text style={styles.hint}>{i18n.t("people.noCapabilities")}</Text>
          ) : (
            <View style={{ marginTop: 4, gap: 8 }}>
              {groupedCapabilities.map((group) => {
                const isExpanded = expandedCategories.has(group.category);
                const selectedCount = group.items.filter((cap) =>
                  selectedCapabilityIds.includes(cap.capability_id),
                ).length;
                return (
                  <View key={group.category} style={styles.capabilityAccordionCard}>
                    <Pressable
                      onPress={() => toggleCategoryExpanded(group.category)}
                      style={[
                        styles.capabilityAccordionHeader,
                        isExpanded && styles.capabilityAccordionHeaderExpanded,
                      ]}
                    >
                      <View style={styles.capabilityAccordionHeaderAccent} />
                      <View style={styles.capabilityAccordionHeaderContent}>
                        <Text style={styles.capabilityAccordionTitle}>
                          {capabilityCategoryLabel(group.category)}
                        </Text>
                        <View style={styles.capabilityAccordionHeaderRight}>
                          <View style={styles.capabilityCountBadge}>
                            <Text style={styles.capabilityCountBadgeText}>
                              {selectedCount}
                            </Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#6B7280"
                          />
                        </View>
                      </View>
                    </Pressable>
                    {isExpanded ? (
                      <View style={styles.capabilityAccordionBody}>
                        <View style={styles.chipWrap}>
                          {group.items.map((capability) => {
                            const selected = selectedCapabilityIds.includes(capability.capability_id);
                            return (
                              <Pressable
                                key={capability.capability_id}
                                onPress={() => toggleCapability(capability.capability_id)}
                                style={[styles.chip, selected && styles.chipSelected]}
                              >
                                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                  {capability.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setIsActive((v) => !v)}
              style={[styles.toggle, isActive && styles.toggleOn]}
            >
              <Text
                style={[styles.toggleText, isActive && styles.toggleTextOn]}
              >
                {i18n.t("bandAdd.activeToggle", {
                  value: isActive
                    ? i18n.t("bandAdd.yes")
                    : i18n.t("bandAdd.no"),
                })}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!currentUserIsAdmin) return;
                setIsAdmin((v) => !v);
              }}
              style={[
                styles.toggle,
                isAdmin && styles.toggleOn,
                !currentUserIsAdmin && { opacity: 0.5 },
              ]}
            >
              <Text style={[styles.toggleText, isAdmin && styles.toggleTextOn]}>
                {i18n.t("bandAdd.adminToggle", {
                  value: isAdmin
                    ? i18n.t("bandAdd.yes")
                    : i18n.t("bandAdd.no"),
                })}
              </Text>
            </Pressable>
          </View>

          {/* ACCESS CONTROLS */}
          <Text style={[styles.label, { marginTop: 18 }]}>{i18n.t("bandAdd.access")}</Text>
          <Text style={styles.hint}>
            {i18n.t("bandAdd.accessHint")}
          </Text>

          <View style={[styles.chipWrap, { marginTop: 10 }]}>
            <ToggleChip
              label={i18n.t("bandAdd.settingsToggle", {
                value: canViewSettings
                  ? i18n.t("bandAdd.on")
                  : i18n.t("bandAdd.off"),
              })}
              value={canViewSettings}
              onPress={() => setCanViewSettings((v) => !v)}
              disabled={!currentUserIsAdmin}
            />
            <ToggleChip
              label={i18n.t("bandAdd.bandCrewToggle", {
                value: canViewBandAndCrew
                  ? i18n.t("bandAdd.on")
                  : i18n.t("bandAdd.off"),
              })}
              value={canViewBandAndCrew}
              onPress={() => setCanViewBandAndCrew((v) => !v)}
              disabled={!currentUserIsAdmin}
            />
            <ToggleChip
              label={i18n.t("bandAdd.bandDocsToggle", {
                value: canViewBandDocs
                  ? i18n.t("bandAdd.on")
                  : i18n.t("bandAdd.off"),
              })}
              value={canViewBandDocs}
              onPress={() => setCanViewBandDocs((v) => !v)}
              disabled={!currentUserIsAdmin}
            />
            <ToggleChip
              label={i18n.t("bandAdd.financeToggle", {
                value: canViewFinance
                  ? i18n.t("bandAdd.on")
                  : i18n.t("bandAdd.off"),
              })}
              value={canViewFinance}
              onPress={() => setCanViewFinance((v) => !v)}
              disabled={!currentUserIsAdmin}
            />
          </View>

          {!currentUserIsAdmin ? (
            <Text style={[styles.hint, { marginTop: 8 }]}>
              {i18n.t("bandAdd.onlyAdminsCanChangeAccess")}
            </Text>
          ) : null}

          <Pressable
            onPress={onSave}
            disabled={saving || !currentUserIsAdmin}
            style={[
              styles.saveButton,
              (saving || !currentUserIsAdmin) && { opacity: 0.7 },
            ]}
          >
            {saving ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator />
                <Text style={styles.saveButtonText}>Saving…</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>{i18n.t("bandAdd.saveAndInvite")}</Text>
            )}
          </Pressable>

          <Text style={styles.note}>
            {i18n.t("bandAdd.note")}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: Platform.OS === "ios" ? 180 : 140 },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  hint: { fontSize: 12, fontWeight: "600", color: "#666" },
  note: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    lineHeight: 16,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 14,
  },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipSelected: { backgroundColor: "#009999", borderColor: "#009999" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#333" },
  chipTextSelected: { color: "#fff" },

  capabilityAccordionCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  capabilityAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "#FAFAFA",
  },
  capabilityAccordionHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  capabilityAccordionHeaderAccent: {
    width: 5,
    alignSelf: "stretch",
    backgroundColor: "#009999",
  },
  capabilityAccordionHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  capabilityAccordionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    paddingRight: 10,
  },
  capabilityAccordionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },
  capabilityCountBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: "#E6F7F7",
    borderWidth: 1,
    borderColor: "#009999",
    alignItems: "center",
    justifyContent: "center",
  },
  capabilityCountBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#007A7A",
    lineHeight: 13,
  },
  capabilityAccordionBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },

  toggleRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  toggle: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleOn: { borderColor: "#009999" },
  toggleText: { fontSize: 13, fontWeight: "800", color: "#333" },
  toggleTextOn: { color: "#009999" },

  saveButton: {
    marginTop: 18,
    backgroundColor: "#009999",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
