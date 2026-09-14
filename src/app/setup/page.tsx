import { headers } from "next/headers";
import os from "node:os";
import { CopyField } from "@/components/CopyField";
import { getI18n } from "@/i18n/server";
import { format } from "@/i18n";
import { config, hasOpenAI } from "@/lib/config";

export const dynamic = "force-dynamic";

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === "IPv4" && !i.internal) out.push(i.address);
    }
  }
  return out;
}

export default async function SetupPage() {
  const { m } = await getI18n();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const port = host.includes(":") ? host.split(":")[1] : proto === "https" ? "443" : "80";
  const isLocalHost = /^(localhost|127\.0\.0\.1)/.test(host);
  const lan = lanAddresses();
  const base = isLocalHost && lan[0] ? `http://${lan[0]}:${port}` : `${proto}://${host}`;
  const endpoint = `${base}/api/capture`;
  const token = config.captureToken;

  const curl = `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer ${token ?? "<CAPTURE_TOKEN>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Je voudrais ajouter un personnage féminin négatif dans mon roman, une rivale de la narratrice.","source":"api","wait":true}'`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">{m.setup.title}</h1>
        <p className="text-muted mt-1">{m.setup.intro}</p>
      </div>

      <section className="card p-5 space-y-4">
        <div>
          <span className="label">{m.setup.endpoint}</span>
          <CopyField value={endpoint} />
          <p className="text-xs text-muted mt-1.5">{m.setup.endpointHint}</p>
          {lan.length > 1 && (
            <p className="text-xs text-muted mt-1">
              {lan.map((ip) => (
                <code key={ip} className="mr-2">
                  {ip}
                </code>
              ))}
            </p>
          )}
        </div>
        <div>
          <span className="label">{m.setup.token}</span>
          {token ? <CopyField value={token} secret /> : <p className="text-danger text-sm">{m.setup.tokenMissing}</p>}
          <p className="text-xs text-muted mt-1.5">{m.setup.tokenHint}</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">{m.setup.stepsTitle}</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
          {m.setup.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">{m.setup.audioTitle}</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
          {m.setup.audioSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="font-semibold">{m.setup.modeTitle}</h2>
        <p className="text-sm">
          {hasOpenAI() ? format(m.setup.modeReal, { model: config.openai.model }) : m.setup.modeMock}
        </p>
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="font-semibold">{m.setup.testTitle}</h2>
        <p className="text-sm text-muted">{m.setup.testHint}</p>
        <pre className="text-xs bg-surface-2 rounded-lg p-3 overflow-x-auto whitespace-pre">{curl}</pre>
      </section>
    </div>
  );
}
