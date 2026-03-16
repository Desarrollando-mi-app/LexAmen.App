import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const MIME_TYPES_PERMITIDOS = [
  "audio/webm",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
  "audio/ogg",
  "audio/x-m4a",
  "audio/mp4; codecs=opus",
  "audio/webm; codecs=opus",
  "audio/webm;codecs=opus",
];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB — límite de Whisper

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");
  return new OpenAI({ apiKey });
}

export async function POST(request: Request) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Obtener archivo de audio
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    return NextResponse.json(
      { error: "No se recibió audio" },
      { status: 400 }
    );
  }

  // Validar tamaño
  if (audioFile.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "El audio excede el límite de 25MB" },
      { status: 400 }
    );
  }

  // Validar MIME type (flexible — el navegador puede enviar variantes)
  const mimeBase = audioFile.type.split(";")[0].trim();
  if (
    !MIME_TYPES_PERMITIDOS.some(
      (t) => t === audioFile.type || t === mimeBase
    )
  ) {
    return NextResponse.json(
      {
        error: `Formato de audio no soportado: ${audioFile.type}. Usa webm, mp4, wav, mpeg u ogg.`,
      },
      { status: 400 }
    );
  }

  try {
    const openai = getOpenAI();

    // Convertir a File para la API de OpenAI
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determinar extensión del nombre según MIME
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/x-m4a": "m4a",
    };
    const ext = extMap[mimeBase] || "webm";
    const file = new File([buffer], `audio.${ext}`, { type: audioFile.type });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "es",
      response_format: "text",
      // Prompt con terminología jurídica para mejorar precisión
      prompt:
        "Derecho Civil, Derecho Procesal Civil, Código Civil, nulidad, obligaciones, acto jurídico, jurisprudencia, prescripción, caducidad, servidumbre, usufructo, hipoteca, prenda, fianza, solidaridad, mancomunidad, resolución, rescisión, inoponibilidad, simulación, causa lícita, objeto lícito, capacidad, consentimiento, tradición, posesión, dominio, título, modo de adquirir, artículo",
    });

    // Whisper con response_format:"text" retorna string directo
    const text =
      typeof transcription === "string"
        ? transcription.trim()
        : String(transcription).trim();

    if (!text) {
      return NextResponse.json(
        { error: "No se detectó voz en el audio. Intenta hablar más fuerte." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Error transcribiendo audio:", err);
    return NextResponse.json(
      {
        error:
          "No se pudo transcribir el audio. Intenta de nuevo o escribe tu respuesta.",
      },
      { status: 500 }
    );
  }
}
