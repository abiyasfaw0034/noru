import { Hotel, LogIn } from "lucide-react";

import { login } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <section className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">
            <Hotel aria-hidden size={24} />
          </span>
          <div>
            <strong>Noru Hotel Ops</strong>
            <span>Secure staff management</span>
          </div>
        </div>

        <div>
          <h1 className="page-title">Sign in</h1>
          <p className="page-kicker">Use a super-admin or hotel manager account.</p>
        </div>

        {params.error === "invalid" ? (
          <div className="form-error">Invalid email or password.</div>
        ) : null}

        <form action={login} className="single-form">
          <input name="next" type="hidden" value={params.next ?? "/"} />
          <label>
            Email
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Password
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          <div className="form-actions">
            <SubmitButton>
              <LogIn aria-hidden size={16} />
              Sign in
            </SubmitButton>
          </div>
        </form>
      </div>
    </section>
  );
}
