/**
 * TTS — Text-to-Speech via OpenAI + Supabase Storage
 * Genera audio MP3 y lo sube al bucket "simulacro-audio".
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");
  return new OpenAI({ apiKey });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars faltantes");
  return createClient(url, key);
}

export async function generarAudioTTS(
  texto: string,
  voz: TTSVoice,
  sesionId: string,
  nombre: string
): Promise<string> {
  const openai = getOpenAI();

  // Generar audio con OpenAI TTS
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: voz,
    input: texto,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  const path = `${sesionId}/${nombre}.mp3`;

  // Subir a Supabase Storage
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from("simulacro-audio")
    .upload(path, buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) {
    console.error("Error subiendo audio TTS:", error);
    throw new Error(`Error al subir audio: ${error.message}`);
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from("simulacro-audio")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Limpia audios de sesiones completadas hace más de 24h.
 */
export async function limpiarAudiosSesion(sesionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: files } = await supabase.storage
    .from("simulacro-audio")
    .list(sesionId);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${sesionId}/${f.name}`);
    await supabase.storage.from("simulacro-audio").remove(paths);
  }
}
