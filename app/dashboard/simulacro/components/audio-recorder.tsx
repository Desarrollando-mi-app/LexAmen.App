"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
}

export default function AudioRecorder({
  onTranscription,
  onRecordingStart,
  onRecordingStop,
  disabled = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [supported, setSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceFramesRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Check browser support
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !window.MediaRecorder
    ) {
      setSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current?.state !== "closed") {
        audioCtxRef.current?.close().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMimeType = useCallback(() => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
      return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "";
  }, []);

  const stopRecording = useCallback(
    (skipTranscription = false) => {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop silence detection
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      silenceFramesRef.current = 0;

      // Stop media recorder
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Close audio context
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        analyserRef.current = null;
      }

      setIsRecording(false);
      setDuration(0);
      onRecordingStop?.();

      if (skipTranscription) {
        chunksRef.current = [];
      }
    },
    [onRecordingStop]
  );

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("audio", blob, "audio.webm");

        const res = await fetch("/api/simulacro/transcribir", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al transcribir");
        }

        if (data.text) {
          onTranscription(data.text);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Error al transcribir. Intenta escribir tu respuesta.";
        setError(msg);
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscription]
  );

  // Silence detection via AnalyserNode
  const startSilenceDetection = useCallback(
    (stream: MediaStream) => {
      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const SILENCE_THRESHOLD = 10; // 0-255
        const SILENCE_DURATION_MS = 3000;
        const CHECK_INTERVAL_MS = 100;
        let silentSince: number | null = null;

        const checkSilence = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Average volume
          const avg =
            dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

          if (avg < SILENCE_THRESHOLD) {
            if (!silentSince) silentSince = Date.now();
            if (Date.now() - silentSince >= SILENCE_DURATION_MS) {
              // 3 seconds of silence → stop
              stopRecording();
              return;
            }
          } else {
            silentSince = null;
          }

          animFrameRef.current = requestAnimationFrame(() =>
            setTimeout(checkSilence, CHECK_INTERVAL_MS)
          );
        };

        // Small delay before starting detection to avoid premature stop
        setTimeout(checkSilence, 1000);
      } catch {
        // Silence detection is optional — continue without it
      }
    },
    [stopRecording]
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (chunks.length > 0) {
          const blob = new Blob(chunks, {
            type: mimeType || "audio/webm",
          });
          // Only transcribe if we have meaningful audio (> 1KB)
          if (blob.size > 1024) {
            transcribeAudio(blob);
          }
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      onRecordingStart?.();

      // Start duration timer
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);

      // Start silence detection
      startSilenceDetection(stream);
    } catch (err) {
      const error = err as DOMException;
      if (error.name === "NotAllowedError") {
        setError(
          "Necesitas permitir el acceso al micrófono para responder con voz."
        );
      } else if (error.name === "NotFoundError") {
        setError("No se detectó un micrófono en tu dispositivo.");
      } else {
        setError("Error al acceder al micrófono. Intenta escribir tu respuesta.");
      }
    }
  }, [
    getMimeType,
    onRecordingStart,
    startSilenceDetection,
    transcribeAudio,
  ]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Not supported — don't render
  if (!supported) return null;

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setError(null)}
          className="flex items-center gap-2 rounded-[4px] border border-gz-red/30 bg-gz-red/[0.05] px-4 py-2.5 font-archivo text-[13px] font-semibold text-gz-red transition-all hover:bg-gz-red/[0.1]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="truncate max-w-[180px]">{error}</span>
        </button>
      </div>
    );
  }

  // Transcribing state
  if (isTranscribing) {
    return (
      <button
        disabled
        className="flex items-center gap-2 rounded-[4px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink-light opacity-60 cursor-wait"
      >
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Transcribiendo...
      </button>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className="flex items-center gap-2 rounded-[4px] border border-gz-red bg-gz-red/[0.08] px-4 py-2.5 font-archivo text-[13px] font-semibold text-gz-red transition-all hover:bg-gz-red/[0.15]"
      >
        {/* Pulsing dot */}
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gz-red opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-gz-red" />
        </span>
        Grabando...
        <span className="font-ibm-mono text-[11px] text-gz-red/70 ml-1">
          {formatDuration(duration)}
        </span>
      </button>
    );
  }

  // Default state — ready to record
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-[4px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink-mid transition-all hover:border-gz-gold hover:text-gz-gold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Microphone icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
      Hablar
    </button>
  );
}
