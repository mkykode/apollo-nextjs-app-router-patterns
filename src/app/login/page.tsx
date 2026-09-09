import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { PageContainer } from "@/components/page-container";
import { Panel } from "@/components/panel";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { safeRedirectPath } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Sign in" };

/**
 * A Server Component page: it reads callbackUrl from the URL (which makes the route dynamic)
 * and renders the Client Component form. The proxy sends signed-in visitors away from here.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  return (
    <PageContainer>
      <Panel title="Sign in">
        <p>
          The demo account is <code>{DEMO_ACCOUNT.email}</code> with the password{" "}
          <code>{DEMO_ACCOUNT.password}</code>. The session is a JWT in an HttpOnly cookie;
          the Odyssey API ignores it, so signing in only unlocks what this app checks itself.
        </p>
        <LoginForm redirectTo={safeRedirectPath(callbackUrl)} />
      </Panel>
    </PageContainer>
  );
}
