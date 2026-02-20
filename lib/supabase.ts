import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isWeb = Platform.OS === 'web';
const isBrowser = typeof window !== 'undefined';

// Only load AsyncStorage on native (prevents web SSR from ever touching it)
const storage = !isWeb
  ? require('@react-native-async-storage/async-storage').default
  : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: isWeb ? isBrowser : true,
    autoRefreshToken: isWeb ? isBrowser : true,
    detectSessionInUrl: false,
  },
});