import { SIGNED_URL_TTL } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { Alert, Platform, Share } from "react-native";

type Scope = "band" | "event";

async function getSignedDocUrl(scope: Scope, docId: string): Promise<string> {
  const table = scope === "band" ? "band_documents" : "event_documents";

  const { data: docRow, error: docErr } = await supabase
    .from(table)
    .select("storage_bucket, storage_path")
    .eq("doc_id", docId)
    .single();

  if (docErr) throw docErr;
  if (!docRow) throw new Error("Document not found");

  const { data: signed, error: signErr } = await supabase.storage
    .from(docRow.storage_bucket)
    .createSignedUrl(docRow.storage_path, SIGNED_URL_TTL);

  if (signErr) throw signErr;
  if (!signed?.signedUrl) throw new Error("No signed URL returned");

  return signed.signedUrl;
}

export async function openDoc(scope: Scope, docId: string) {
  const url = await getSignedDocUrl(scope, docId);

  if (Platform.OS === "web") {
    // @ts-ignore
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  await Linking.openURL(url);
}

export async function shareDoc(scope: Scope, docId: string, title: string) {
  const url = await getSignedDocUrl(scope, docId);

  if (Platform.OS === "web") {
    // @ts-ignore
    const canWebShare = typeof navigator !== "undefined" && !!navigator.share;

    if (canWebShare) {
      // @ts-ignore
      await navigator.share({ title, text: title, url });
      return;
    }

    await Clipboard.setStringAsync(url);
    Alert.alert("Link copied", "Share link copied to clipboard.");
    return;
  }

  await Share.share({ message: `${title}\n${url}` });
}
