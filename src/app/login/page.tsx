import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PageContainer } from "@/components/page-container";
import { Panel } from "@/components/panel";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { ACCOUNT_PATH, safeRedirectPath } from "@/lib/auth/paths";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

/**
 * A Server Component page: it reads callbackUrl from the URL (which makes the route dynamic)
 * and renders the Client Component form.
 *
 * Sending signed-in visitors away is this page's job rather than the proxy's, because it takes
 * a verified answer. The proxy only sees whether a cookie exists, and a cookie whose session
 * row is gone would bounce off this page into /account, which redirects back here: a loop with
 * no way out. Checking the session for real means a dead cookie simply lands on the form, and
 * signing in overwrites it.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ callbackUrl }, session] = await Promise.all([searchParams, getSession()]);
  if (session) {
    redirect(ACCOUNT_PATH);
  }
  return (
    <PageContainer>
      <Panel title="Sign in">
        <p>
          The demo account is <code>{DEMO_ACCOUNT.email}</code> with the password{" "}
          <code>{DEMO_ACCOUNT.password}</code>. The session is a row in SQLite, keyed by an
          HttpOnly cookie, so signing out revokes it for real; the Odyssey API ignores all of
          it, so signing in only unlocks what this app checks itself.
        </p>
        <LoginForm redirectTo={safeRedirectPath(callbackUrl)} />
      </Panel>
    </PageContainer>
  );
}
