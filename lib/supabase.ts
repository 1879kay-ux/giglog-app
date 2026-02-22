import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isWeb = Platform.OS === 'web';
const isBrowser = typeof window !== 'undefined';

// IMPORTANT: Only load AsyncStorage on native.
// If you import it on web, it can break SSR/bundling/session recovery.
const asyncStorage = !isWeb
  ? require('@react-native-async-storage/async-storage').default
  : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: asyncStorage,               // native only
    persistSession: isWeb ? isBrowser : true,
    autoRefreshToken: isWeb ? isBrowser : true,
    detectSessionInUrl: false,
  },
});
