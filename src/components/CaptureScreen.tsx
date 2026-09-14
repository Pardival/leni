"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";
import { IconClose, IconKeyboard, IconMic } from "./icons";

/* Types minimaux pour la Web Speech API (absents des libs TS par défaut). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SPEECH_LANG: Record<string, string> = { fr: "fr-FR", en: "en-US" };

/**
 * Écran de capture plein cadre : dictée (Web Speech) avec transcription en
 * direct, ou enregistrement audio (Whisper) si la dictée n'est pas disponible,
 * ou saisie clavier.
 */
export function CaptureScreen({ canRecordAudio }: { canRecordAudio: boolean }) {
  const { m, locale } = useI18n();
  const router = useRouter();
  const dictationSupported = useSyncExternalStore(() => () => {}, () => Boolean(getSpeechRecognition()), () => true);

  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const baseTextRef = useRef("");

  const active = listening || recording;

  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function startDictation() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return startRecording();
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[locale] ?? locale;
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = text ? `${text.trimEnd()} ` : "";
    rec.onresult = (e) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finals += t;
        else interim += t;
      }
      setText(baseTextRef.current + finals + interim);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }

  function stopDictation() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function startRecording() {
    if (!canRecordAudio) {
      setError(m.capture.recordingNeedsKey);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        await sendAudio(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setError(null);
      setRecording(true);
    } catch (err) {
      setError(String(err));
    }
  }

  async function sendAudio(blob: Blob) {
    setSending(true);
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `recording.${ext}`);
      form.append("source", "web");
      form.append("language", locale);
      const res = await fetch("/api/capture", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const note = (await res.json()) as { id: string };
      router.push(`/notes/${note.id}`);
    } catch (err) {
      setError(`${m.capture.error} ${String(err)}`);
      setSending(false);
    }
  }

  async function submitText() {
    const value = text.trim();
    if (!value || sending) return;
    if (listening) stopDictation();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: value, language: locale }),
      });
      if (!res.ok) throw new Error(await res.text());
      const note = (await res.json()) as { id: string };
      router.push(`/notes/${note.id}`);
    } catch (err) {
      setError(`${m.capture.error} ${String(err)}`);
      setSending(false);
    }
  }

  /** Bouton principal : démarre, ou termine et envoie. */
  function primary() {
    if (sending) return;
    if (listening) {
      stopDictation();
      if (text.trim()) void submitText();
      return;
    }
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (mode === "text") return void submitText();
    if (dictationSupported) startDictation();
    else void startRecording();
  }

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-40 flex flex-col text-white" style={{ background: "linear-gradient(180deg, #ff7a55 0%, #f4532d 60%, #d93d1a 100%)" }}>
      {/* Haut */}
      <div className="flex items-center justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Link href="/" className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center" aria-label={m.common.back}>
          <IconClose />
        </Link>
        <div className="flex items-center gap-2">
          {active && (
            <span className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/20 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-white pulse" />
              {mm}:{ss}
            </span>
          )}
          <button
            type="button"
            className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center"
            onClick={() => {
              if (listening) stopDictation();
              setMode((v) => (v === "voice" ? "text" : "voice"));
            }}
            aria-label={mode === "voice" ? m.capture.typeInstead : m.capture.dictateInstead}
            title={mode === "voice" ? m.capture.typeInstead : m.capture.dictateInstead}
          >
            {mode === "voice" ? <IconKeyboard /> : <IconMic />}
          </button>
        </div>
      </div>

      {/* Milieu : transcription ou saisie */}
      <div className="flex-1 flex flex-col gap-4 px-7 pt-12 overflow-y-auto max-w-2xl w-full mx-auto">
        <div className="text-xs font-semibold tracking-[0.1em] uppercase opacity-80">
          {active ? m.capture.listening : mode === "text" ? m.capture.title : m.capture.tapToStart}
        </div>
        {mode === "text" ? (
          <textarea
            className="w-full flex-1 min-h-40 bg-transparent outline-none resize-none display text-[1.6rem] font-semibold leading-tight placeholder:text-white/50"
            placeholder={m.capture.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitText();
            }}
            autoFocus
          />
        ) : (
          <div className="display text-[1.75rem] font-semibold leading-[1.2]">{text || <span className="opacity-50">{m.capture.placeholder}</span>}</div>
        )}
        {error && <p className="text-sm bg-black/25 rounded-xl px-3 py-2">{error}</p>}
        {!dictationSupported && !canRecordAudio && mode === "voice" && <p className="text-sm opacity-90">{m.capture.dictationUnsupported}</p>}
      </div>

      {/* Bas : onde + bouton */}
      <div className="flex flex-col items-center gap-6 px-6 pb-[max(2.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1.5 h-12" aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-12 rounded-full bg-white/90 ${active ? "wave-bar" : ""}`}
              style={{ "--i": i, transform: active ? undefined : "scaleY(0.2)" } as React.CSSProperties}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={primary}
          disabled={sending || (mode === "text" && !text.trim())}
          className="relative w-[88px] h-[88px] flex items-center justify-center disabled:opacity-60"
          aria-label={active ? m.capture.tapToFinish : m.capture.tapToStart}
        >
          {active && <span className="ring absolute inset-0 rounded-full border-2 border-white/70" />}
          <span className="w-[88px] h-[88px] rounded-full bg-white flex items-center justify-center shadow-xl">
            {sending ? (
              <span className="w-7 h-7 rounded-full border-[3px] border-accent border-t-transparent animate-spin" />
            ) : active ? (
              <span className="w-7 h-7 rounded-lg bg-accent" />
            ) : mode === "text" ? (
              <span className="text-accent font-bold text-sm">OK</span>
            ) : (
              <IconMic size={32} className="text-accent" />
            )}
          </span>
        </button>
        <div className="text-sm font-semibold opacity-90">
          {sending ? m.capture.submitting : active ? m.capture.tapToFinish : mode === "text" ? "⌘↵" : m.capture.tapToStart}
        </div>
      </div>
    </div>
  );
}

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}
