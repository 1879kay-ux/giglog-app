import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

const isWeb = Platform.OS === "web";
const isBrowser = typeof window !== "undefined";

// Native storage
const asyncStorage =
  !isWeb ? require("@react-native-async-storage/async-storage").default : undefined;

// Web storage adapter (explicit)
const webStorage =
  isWeb && isBrowser
    ? {
        getItem: (key: string) => window.localStorage.getItem(key),
        setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
        removeItem: (key: string) => window.localStorage.removeItem(key),
      }
    : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? webStorage : asyncStorage,
    persistSession: isWeb ? isBrowser : true,
    autoRefreshToken: isWeb ? isBrowser : true,
    detectSessionInUrl: false,
  },
});