"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

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
type Ctor = new () => SpeechRecognitionLike;

function getCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANG: Record<string, string> = { fr: "fr-FR", en: "en-US" };

/** Dictée navigateur (Web Speech API) : texte cumulé + interim, start/stop. */
export function useDictation(locale: string, onText: (text: string) => void) {
  const supported = useSyncExternalStore(() => () => {}, () => Boolean(getCtor()), () => true);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  const start = useCallback(
    (base = "") => {
      const C = getCtor();
      if (!C) return;
      const rec = new C();
      rec.lang = LANG[locale] ?? locale;
      rec.continuous = true;
      rec.interimResults = true;
      baseRef.current = base ? `${base.trimEnd()} ` : "";
      rec.onresult = (e) => {
        let finals = "";
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i]!;
          const t = r[0]?.transcript ?? "";
          if (r.isFinal) finals += t;
          else interim += t;
        }
        onTextRef.current(baseRef.current + finals + interim);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    },
    [locale],
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => recRef.current?.stop(), []);

  return { supported, listening, start, stop };
}
