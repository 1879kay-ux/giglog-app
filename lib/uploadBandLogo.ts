import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";

// Returns the public URL you can store in bands.logo_url
export async function pickAndUploadBandLogo(bandId: string) {
  // 1) Pick image
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (res.canceled) return { canceled: true as const };

  const asset = res.assets[0];
  if (!asset.uri) throw new Error("No image uri returned by picker.");

  // 2) Fetch as blob + convert to ArrayBuffer for Supabase upload
  const fileResp = await fetch(asset.uri);
  const blob = await fileResp.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const ext = (
    asset.fileName?.split(".").pop() ||
    blob.type.split("/").pop() ||
    "jpg"
  )
    .toLowerCase()
    .replace("jpeg", "jpg");

  const objectPath = `${bandId}/logo.${ext}`;

  // 3) Upload (upsert so replacing is easy)
  const { error: uploadError } = await supabase.storage
    .from("band-logos")
    .upload(objectPath, arrayBuffer, {
      contentType: blob.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // 4) Get public URL
  const { data } = supabase.storage.from("band-logos").getPublicUrl(objectPath);

  return { canceled: false as const, publicUrl: data.publicUrl, objectPath };
}
