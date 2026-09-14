"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";

/* Types minimaux pour la Web Speech API (absents des libs TS par défaut). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
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

export function CaptureBox({ canRecordAudio }: { canRecordAudio: boolean }) {
  const { m, locale } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState(false);

  // Dictée (Web Speech API)
  const dictationSupported = useSyncExternalStore(
    () => () => {},
    () => Boolean(getSpeechRecognition()),
    () => true,
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");

  // Enregistrement audio (MediaRecorder → Whisper)
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
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
    setListening(true);
    rec.start();
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await sendAudio(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(String(err));
    }
  }

  async function currentPosition(): Promise<{ lat: number; lng: number } | null> {
    if (!useLocation || !("geolocation" in navigator)) return null;
    return new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60_000 },
      ),
    );
  }

  async function sendAudio(blob: Blob) {
    setSending(true);
    setError(null);
    try {
      const pos = await currentPosition();
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `recording.${ext}`);
      form.append("source", "web");
      form.append("language", locale);
      if (pos) {
        form.append("lat", String(pos.lat));
        form.append("lng", String(pos.lng));
      }
      const res = await fetch("/api/capture", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const note = (await res.json()) as { id: string };
      router.push(`/notes/${note.id}`);
    } catch (err) {
      setError(`${m.capture.error} ${String(err)}`);
      setSending(false);
    }
  }

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    if (listening) recognitionRef.current?.stop();
    setSending(true);
    setError(null);
    try {
      const pos = await currentPosition();
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: value, language: locale, lat: pos?.lat ?? null, lng: pos?.lng ?? null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const note = (await res.json()) as { id: string };
      setText("");
      router.push(`/notes/${note.id}`);
    } catch (err) {
      setError(`${m.capture.error} ${String(err)}`);
      setSending(false);
    }
  }

  return (
    <div className="card p-4 sm:p-6 space-y-4">
      <textarea
        className="input min-h-40 text-base prose-note"
        placeholder={listening ? m.capture.listening : m.capture.placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        autoFocus
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`btn ${listening ? "btn-primary recording" : ""}`}
          onClick={toggleDictation}
          disabled={!dictationSupported || sending || recording}
          title={!dictationSupported ? m.capture.dictationUnsupported : undefined}
        >
          <MicIcon />
          {listening ? m.capture.stopDictation : m.capture.dictate}
        </button>

        <button
          type="button"
          className={`btn ${recording ? "btn-primary recording" : ""}`}
          onClick={toggleRecording}
          disabled={!canRecordAudio || sending || listening}
          title={!canRecordAudio ? m.capture.recordingNeedsKey : undefined}
        >
          <RecIcon />
          {recording ? m.capture.stopRecording : m.capture.record}
        </button>

        <label className="inline-flex items-center gap-2 text-sm text-muted cursor-pointer ml-1">
          <input type="checkbox" checked={useLocation} onChange={(e) => setUseLocation(e.target.checked)} />
          {m.capture.useLocation}
        </label>

        <button type="button" className="btn btn-primary ml-auto" onClick={submit} disabled={!text.trim() || sending}>
          {sending ? m.capture.submitting : m.capture.submit} <kbd className="hidden sm:inline text-[10px] opacity-70">⌘↵</kbd>
        </button>
      </div>

      {!dictationSupported && <p className="text-xs text-muted">{m.capture.dictationUnsupported}</p>}
      {!canRecordAudio && <p className="text-xs text-muted">{m.capture.mockMode}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
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

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
function RecIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}
