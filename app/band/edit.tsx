import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const INSTRUMENTS = [
  "Lead Vox",
  "Backing Vox",
  "Drums",
  "Bass",
  "Lead Guitar",
  "Guitar",
  "Rhythm Guitar",
  "Keyboards",
  "Saxophone",
  "Trumpet",
  "Trombone",
] as const;
type Instrument = (typeof INSTRUMENTS)[number];

const CAPABILITY_CATEGORY_ORDER = [
  "performance",
  "crew",
  "logistics",
  "business",
  "creative_specialist",
  "other",
] as const;
type CapabilityCategory = (typeof CAPABILITY_CATEGORY_ORDER)[number];

type BandMemberRow = {
  member_id: string;
  band_id: string | null;
  display_name: string | null;
  email: string | null;

  member_type: MemberType | null;

  band_role: string | null;
  band_role_other: string | null;

  band_positions: string[] | null;
  band_positions_other: string[] | null;

  is_active: boolean | null;
  is_admin: boolean | null;
  is_dep: boolean | null;

  // per-member access controls
  can_view_settings: boolean | null;
  can_view_band_and_crew: boolean | null;
  can_view_band_docs: boolean | null;
  can_view_finance: boolean | null;
};

type CapabilityChip = {
  capability_id: string;
  name: string;
  category: CapabilityCategory;
};

export default function EditBandMemberScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const cm: any = useCurrentMember();
  const currentUserIsAdmin = !!cm?.isAdmin;
  const adminModeEnabled = cm?.adminModeEnabled !== false;

  // 🔒 Hard gate: if Admin Mode is OFF, this screen should not be accessible.
  const [gateChecked, setGateChecked] = useState(false);
  useEffect(() => {
    // wait for context to be ready (some setups expose cm.loading)
    if (cm?.loading === true) return;

    if (!currentUserIsAdmin || !adminModeEnabled) {
      router.replace("/");
      return;
    }
    setGateChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cm?.loading, currentUserIsAdmin, adminModeEnabled]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const [memberType, setMemberType] = useState<MemberType>("musician");

  const [musicianRole, setMusicianRole] = useState<MusicianRole>("Band");
  const [crewRole, setCrewRole] = useState<CrewRole>("Crew");
  const [roleOther, setRoleOther] = useState("");

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const [customInstrumentInput, setCustomInstrumentInput] = useState("");
  const [loadedCapabilities, setLoadedCapabilities] = useState<CapabilityChip[]>([]);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<CapabilityCategory>>(new Set());

  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // access toggles
  const [canViewSettings, setCanViewSettings] = useState(false);
  const [canViewBandAndCrew, setCanViewBandAndCrew] = useState(false);
  const [canViewBandDocs, setCanViewBandDocs] = useState(false);
  const [canViewFinance, setCanViewFinance] = useState(false);
  const stickyFooterHeight = 92 + insets.bottom;

  const role = useMemo(() => {
    return memberType === "musician" ? musicianRole : crewRole;
  }, [memberType, musicianRole, crewRole]);

  const isDep = useMemo(
    () => memberType === "musician" && musicianRole === "Dep Musician",
    [memberType, musicianRole],
  );

  useEffect(() => {
    const loadMember = async () => {
      if (!gateChecked) return;

      if (!id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("band_members")
        .select(
          [
            "member_id",
            "band_id",
            "display_name",
            "email",
            "member_type",
            "band_role",
            "band_role_other",
            "band_positions",
            "band_positions_other",
            "is_active",
            "is_admin",
            "is_dep",
            "can_view_settings",
            "can_view_band_and_crew",
            "can_view_band_docs",
            "can_view_finance",
          ].join(","),
        )
        .eq("member_id", id)
        .single();

      if (error) {
        console.log("loadMember error", error);
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      const row = data as BandMemberRow;

      setDisplayName(row.display_name ?? "");
      setEmail(row.email ?? "");

      const mt: MemberType = (row.member_type as MemberType) ?? "musician";
      setMemberType(mt);

      if (mt === "musician") {
        const rv = (row.band_role ?? "Band") as MusicianRole;
        const isPreset = (MUSICIAN_ROLES as readonly string[]).includes(rv);
        setMusicianRole((isPreset ? rv : "Other") as MusicianRole);
        setCrewRole("Crew");
      } else {
        const rv = (row.band_role ?? "Crew") as CrewRole;
        const isPreset = (CREW_ROLES as readonly string[]).includes(rv);
        setCrewRole((isPreset ? rv : "Other") as CrewRole);
        setMusicianRole("Band");
      }

      setRoleOther(row.band_role_other ?? "");

      setInstruments((row.band_positions as Instrument[]) ?? []);
      setCustomInstruments((row.band_positions_other as string[]) ?? []);

      if (!row.band_id) {
        setLoadedCapabilities([]);
        setSelectedCapabilityIds([]);
        setExpandedCategories(new Set());
      } else {
        const { data: capabilitiesRows, error: capabilitiesError } = await supabase
          .from("capabilities")
          .select("capability_id,name,category")
          .eq("band_id", row.band_id)
          .eq("is_active", true)
          .order("name", { ascending: true });

        let nextCapabilities: CapabilityChip[] = [];
        if (capabilitiesError) {
          console.log("load capabilities catalogue error", capabilitiesError);
          setLoadedCapabilities([]);
        } else {
          nextCapabilities = ((capabilitiesRows ?? []) as any[])
            .filter(
              (item) =>
                item?.capability_id &&
                item?.name &&
                CAPABILITY_CATEGORY_ORDER.includes(
                  item?.category as CapabilityCategory
                ),
            )
            .map((item) => ({
              capability_id: item.capability_id as string,
              name: item.name as string,
              category: item.category as CapabilityCategory,
            }));
          setLoadedCapabilities(nextCapabilities);
        }

        const { data: assignedRows, error: assignedError } = await supabase
          .from("person_capabilities")
          .select("capability_id")
          .eq("member_id", row.member_id);

        let nextSelectedIds: string[] = [];
        if (assignedError) {
          console.log("load assigned capabilities error", assignedError);
          setSelectedCapabilityIds([]);
        } else {
          nextSelectedIds = Array.from(
            new Set(
              ((assignedRows ?? []) as any[])
                .map((item) => item.capability_id)
                .filter((value) => typeof value === "string"),
            ),
          );
          setSelectedCapabilityIds(nextSelectedIds);
        }

        setExpandedCategories(
          new Set<CapabilityCategory>(
            CAPABILITY_CATEGORY_ORDER.filter((category) =>
              nextCapabilities.some(
                (cap) =>
                  cap.category === category &&
                  nextSelectedIds.includes(cap.capability_id),
              ),
            ),
          ),
        );
      }

      setIsAdmin(!!row.is_admin);
      setIsActive(!!row.is_active);

      // default false if null
      setCanViewSettings(!!row.can_view_settings);
      setCanViewBandAndCrew(!!row.can_view_band_and_crew);
      setCanViewBandDocs(!!row.can_view_band_docs);
      setCanViewFinance(!!row.can_view_finance);

      setLoading(false);
    };

    loadMember();
  }, [id, gateChecked]);

  const toggleInstrument = (p: Instrument) => {
    setInstruments((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const addCustomInstrument = () => {
    const v = customInstrumentInput.trim();
    if (!v) return;
    setCustomInstruments((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCustomInstrumentInput("");
  };

  const removeCustomInstrument = (p: string) => {
    setCustomInstruments((prev) => prev.filter((x) => x !== p));
  };

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

  const onSave = async () => {
    if (!id) return;

    const name = displayName.trim();
    if (!name) {
      Alert.alert("Missing name", "Please enter a display name.");
      return;
    }

    const emailClean = email.trim();
    if (!emailClean) {
      Alert.alert("Missing email", "Please enter an email address.");
      return;
    }

    if (role === "Other" && !roleOther.trim()) {
      Alert.alert("Missing role", "Please enter a value for Role (Other).");
      return;
    }

    // only admins in admin mode can save here (screen is gated, but keep this safety)
    if (!currentUserIsAdmin || !adminModeEnabled) {
      Alert.alert("Not allowed", "Admin Mode must be enabled to edit members.");
      return;
    }

    setSaving(true);

    const payload: any = {
      display_name: name,
      email: emailClean,

      member_type: memberType,

      band_role: role,
      band_role_other: role === "Other" ? roleOther.trim() || null : null,

      band_positions: memberType === "musician" ? instruments : [],
      band_positions_other: memberType === "musician" ? customInstruments : [],

      is_admin: isAdmin,
      is_dep: isDep,

      // perms are independent from is_admin
      can_view_settings: canViewSettings,
      can_view_band_and_crew: canViewBandAndCrew,
      can_view_band_docs: canViewBandDocs,
      can_view_finance: canViewFinance,
    };

    const { error } = await supabase
      .from("band_members")
      .update(payload)
      .eq("member_id", id);

    if (error) {
      setSaving(false);
      console.log("update member error", error);
      Alert.alert("Error", error.message);
      return;
    }

    const { error: deleteCapabilitiesError } = await supabase
      .from("person_capabilities")
      .delete()
      .eq("member_id", id);

    if (deleteCapabilitiesError) {
      setSaving(false);
      console.log("delete capabilities error", deleteCapabilitiesError);
      Alert.alert("Error", deleteCapabilitiesError.message);
      return;
    }

    if (selectedCapabilityIds.length > 0) {
      const capabilityRows = selectedCapabilityIds.map((capabilityId) => ({
        member_id: id,
        capability_id: capabilityId,
      }));

      const { error: insertCapabilitiesError } = await supabase
        .from("person_capabilities")
        .insert(capabilityRows);

      if (insertCapabilitiesError) {
        setSaving(false);
        console.log("insert capabilities error", insertCapabilitiesError);
        Alert.alert("Error", insertCapabilitiesError.message);
        return;
      }
    }

    setSaving(false);

    router.back();
  };

  const confirm = async (title: string, message: string) => {
    if (Platform.OS === "web") {
      // @ts-ignore web only
      return window.confirm(`${title}\n\n${message}`);
    }
    return await new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "OK", style: "default", onPress: () => resolve(true) },
      ]);
    });
  };

  const setActiveRow = async (nextActive: boolean) => {
    if (!id) return;

    if (!currentUserIsAdmin || !adminModeEnabled) {
      Alert.alert(
        "Not allowed",
        "Admin Mode must be enabled to change status.",
      );
      return;
    }

    const ok = await confirm(
      nextActive ? "Reactivate member?" : "Deactivate member?",
      nextActive
        ? "This will show them in the active list again."
        : "This will hide them from the active list.",
    );
    if (!ok) return;

    setSaving(true);
    const { error } = await supabase
      .from("band_members")
      .update({ is_active: nextActive })
      .eq("member_id", id);
    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setIsActive(nextActive);
    router.back();
  };

  const rolesToRender = memberType === "musician" ? MUSICIAN_ROLES : CREW_ROLES;

  const roleLabel = (r: string) => {
    if (r === "Band") return t("bandEdit.roleBand");
    if (r === "Dep Musician") return t("bandEdit.roleDepMusician");
    if (r === "Crew") return t("bandEdit.roleCrew");
    if (r === "Tour Manager") return t("bandEdit.roleTourManager");
    if (r === "Merch") return t("bandEdit.roleMerch");
    if (r === "FoH Engineer") return t("bandEdit.roleFohEngineer");
    if (r === "Monitor Engineer") return t("bandEdit.roleMonitorEngineer");
    if (r === "Lighting") return t("bandEdit.roleLighting");
    if (r === "Tech") return t("bandEdit.roleTech");
    if (r === "Other") return t("bandEdit.roleOtherOption");
    return r;
  };

  const instrumentLabel = (p: string) => {
    if (p === "Lead Vox") return t("bandEdit.instrumentLeadVox");
    if (p === "Backing Vox") return t("bandEdit.instrumentBackingVox");
    if (p === "Drums") return t("bandEdit.instrumentDrums");
    if (p === "Bass") return t("bandEdit.instrumentBass");
    if (p === "Lead Guitar") return t("bandEdit.instrumentLeadGuitar");
    if (p === "Guitar") return t("bandEdit.instrumentGuitar");
    if (p === "Rhythm Guitar") return t("bandEdit.instrumentRhythmGuitar");
    if (p === "Keyboards") return t("bandEdit.instrumentKeyboards");
    if (p === "Saxophone") return t("bandEdit.instrumentSaxophone");
    if (p === "Trumpet") return t("bandEdit.instrumentTrumpet");
    if (p === "Trombone") return t("bandEdit.instrumentTrombone");
    return p;
  };

  const capabilityCategoryLabel = (category: CapabilityCategory) => {
    if (category === "performance") return t("people.category.performance");
    if (category === "crew") return t("people.category.crew");
    if (category === "logistics") return t("people.category.logistics");
    if (category === "business") return t("people.category.business");
    if (category === "creative_specialist") {
      return t("people.category.creativeSpecialist");
    }
    return t("people.category.other");
  };

  const groupedCapabilities = CAPABILITY_CATEGORY_ORDER
    .map((category) => ({
      category,
      items: loadedCapabilities.filter((capability) => capability.category === category),
    }))
    .filter((group) => group.items.length > 0);

  if (!gateChecked || loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("bandEdit.title") }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

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
      <Stack.Screen
        options={{
          title: t("bandEdit.title"),
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.primary },
          headerTitleStyle: { color: "#fff", fontWeight: "700" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: stickyFooterHeight + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>{t("bandEdit.name")}</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
          />

          <Text style={styles.label}>{t("bandEdit.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>{t("people.capabilities")}</Text>
          {groupedCapabilities.length === 0 ? (
            <Text style={styles.hint}>{t("people.noCapabilities")}</Text>
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
                              <Text
                                style={[
                                  styles.chipText,
                                  selected && styles.chipTextSelected,
                                ]}
                              >
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
              onPress={() => {
                setIsAdmin((v) => !v);
              }}
              style={[styles.toggle, isAdmin && styles.toggleOn]}
            >
              <Text style={[styles.toggleText, isAdmin && styles.toggleTextOn]}>
                {t("bandEdit.adminToggle", {
                  value: isAdmin ? t("bandEdit.yes") : t("bandEdit.no"),
                })}
              </Text>
            </Pressable>

            <View style={[styles.toggle, { opacity: 0.9 }]}>
              <Text style={styles.toggleText}>
                {t("bandEdit.statusToggle", {
                  value: isActive ? t("bandEdit.active") : t("bandEdit.inactive"),
                })}
              </Text>
            </View>
          </View>

          {/* ACCESS CONTROLS */}
          <Text style={[styles.label, { marginTop: 18 }]}>{t("bandEdit.access")}</Text>
          <Text style={styles.hint}>
            {t("bandEdit.accessHint")}
          </Text>

          <View style={[styles.chipWrap, { marginTop: 10 }]}>
            <ToggleChip
              label={t("bandEdit.settingsToggle", {
                value: canViewSettings ? t("bandEdit.on") : t("bandEdit.off"),
              })}
              value={canViewSettings}
              onPress={() => setCanViewSettings((v) => !v)}
            />
            <ToggleChip
              label={t("bandEdit.bandCrewToggle", {
                value: canViewBandAndCrew ? t("bandEdit.on") : t("bandEdit.off"),
              })}
              value={canViewBandAndCrew}
              onPress={() => setCanViewBandAndCrew((v) => !v)}
            />
            <ToggleChip
              label={t("bandEdit.bandDocsToggle", {
                value: canViewBandDocs ? t("bandEdit.on") : t("bandEdit.off"),
              })}
              value={canViewBandDocs}
              onPress={() => setCanViewBandDocs((v) => !v)}
            />
            <ToggleChip
              label={t("bandEdit.financeToggle", {
                value: canViewFinance ? t("bandEdit.on") : t("bandEdit.off"),
              })}
              value={canViewFinance}
              onPress={() => setCanViewFinance((v) => !v)}
            />
          </View>

          {isActive ? (
            <Pressable
              onPress={() => setActiveRow(false)}
              disabled={saving}
              style={[styles.dangerButton, saving && { opacity: 0.7 }]}
            >
              <Text style={styles.dangerButtonText}>{t("bandEdit.deactivateMember")}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setActiveRow(true)}
              disabled={saving}
              style={[styles.activateButton, saving && { opacity: 0.7 }]}
            >
              <Text style={styles.activateButtonText}>{t("bandEdit.reactivateMember")}</Text>
            </Pressable>
          )}
        </ScrollView>

        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <Pressable
            onPress={onSave}
            disabled={saving}
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving…" : t("bandEdit.saveChanges")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },

  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  hint: { fontSize: 12, fontWeight: "600", color: "#666" },

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

  customRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  addButton: {
    backgroundColor: "#009999",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "800" },
  customChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

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

  dangerButton: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E74C3C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  dangerButtonText: { color: "#E74C3C", fontSize: 15, fontWeight: "800" },

  activateButton: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#009999",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  activateButtonText: { color: "#009999", fontSize: 15, fontWeight: "800" },
});
