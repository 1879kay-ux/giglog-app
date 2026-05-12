import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push notifications skipped: not a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return token.data;
}

export async function savePushToken(userId: string, bandId: string) {
  const expoPushToken = await registerForPushNotificationsAsync();

  if (!expoPushToken) {
    return null;
  }

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      band_id: bandId,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_name: Device.deviceName,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "expo_push_token",
    },
  );

  if (error) {
    console.log("Push token save error:", error.message);
    return null;
  }

  return expoPushToken;
}
