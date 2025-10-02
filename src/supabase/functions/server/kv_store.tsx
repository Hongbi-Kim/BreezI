import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const client = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  
  return createClient(url, key);
};

// Set stores a key-value pair in the database.
export const set = async (key, value) => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_58f75568").upsert({
    key,
    value
  });
  if (error) {
    throw new Error(error.message);
  }
};

// Get retrieves a key-value pair from the database.
export const get = async (key) => {
  const supabase = client();
  const { data, error } = await supabase
    .from("kv_store_58f75568")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.value;
};

// Delete deletes a key-value pair from the database.
export const del = async (key) => {
  const supabase = client();
  const { error } = await supabase
    .from("kv_store_58f75568")
    .delete()
    .eq("key", key);
  if (error) {
    throw new Error(error.message);
  }
};

// Sets multiple key-value pairs in the database.
export const mset = async (keys, values) => {
  const supabase = client();
  const { error } = await supabase
    .from("kv_store_58f75568")
    .upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
  if (error) {
    throw new Error(error.message);
  }
};

// Gets multiple key-value pairs from the database.
export const mget = async (keys) => {
  const supabase = client();
  const { data, error } = await supabase
    .from("kv_store_58f75568")
    .select("value")
    .in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};

// Deletes multiple key-value pairs from the database.
export const mdel = async (keys) => {
  const supabase = client();
  const { error } = await supabase
    .from("kv_store_58f75568")
    .delete()
    .in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
};

// Search for key-value pairs by prefix.
export const getByPrefix = async (prefix) => {
  const supabase = client();
  const { data, error } = await supabase
    .from("kv_store_58f75568")
    .select("key, value")
    .like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};