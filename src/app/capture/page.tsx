import { CaptureScreen } from "@/components/CaptureScreen";
import { hasOpenAI } from "@/lib/config";

export default function CapturePage() {
  return <CaptureScreen canRecordAudio={hasOpenAI()} />;
}
