import { CaptureBox } from "@/components/CaptureBox";
import { getI18n } from "@/i18n/server";
import { hasOpenAI } from "@/lib/config";

export default async function CapturePage() {
  const { m } = await getI18n();
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{m.capture.title}</h1>
      <CaptureBox canRecordAudio={hasOpenAI()} />
    </div>
  );
}
