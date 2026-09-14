import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { getI18n } from "@/i18n/server";

export default async function LoginPage() {
  const { m } = await getI18n();
  return (
    <div className="max-w-sm mx-auto mt-16 card p-6 space-y-4">
      <h1 className="text-xl font-semibold">{m.login.title}</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
