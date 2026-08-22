import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export async function getAuthSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signInWithGoogle() {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL(import.meta.env.BASE_URL || "/", window.location.origin).toString()
    }
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadUserState(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("user_states")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

export async function saveUserState(userId, payload) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from("user_states")
    .upsert({
      user_id: userId,
      payload,
      updated_at: new Date().toISOString()
    });
  if (error) throw error;
}

export async function loadPublicPosts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("id, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map((row) => ({ ...row.payload, id: row.payload?.id || row.id }));
}

export async function savePublicPost(userId, post) {
  if (!supabase || !userId) return post;
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      payload: post
    })
    .select("id, payload")
    .single();
  if (error) throw error;
  return { ...data.payload, id: data.payload?.id || data.id };
}
