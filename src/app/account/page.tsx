import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/button";
import { PageContainer } from "@/components/page-container";
import { Panel } from "@/components/panel";
import { signOutAction } from "@/lib/actions/auth";
import { readAccessToken } from "@/lib/auth/access-token";
import { ACCOUNT_PATH, signInHref } from "@/lib/auth/paths";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

/** Enough of the token to see it changes per sign-in, not enough to reuse it. */
const mask = (token: string) => `${token.slice(0, 8)}…`;

/**
 * The proxy already turned strangers away, but it only looked for a cookie. The page checks
 * again with getSession(), next to the data it renders: this call verifies the cookie's
 * signature and loads the session row, so a revoked session fails here even though it passed
 * the proxy. That is the defense in depth both auth guides ask for. Reading the session reads
 * headers, which makes the route dynamic; no segment config needed.
 */
export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    redirect(signInHref(ACCOUNT_PATH));
  }

  const accessToken = readAccessToken(session.session.token);

  return (
    <PageContainer>
      <Panel title="Mission control">
        {/* One template literal, so the HTML has one text node and can be checked as text. */}
        <p data-testid="signed-in-as">
          {`Signed in as ${session.user.name} (${session.user.email}).`}
        </p>
        <p>
          API token <code>{accessToken ? mask(accessToken) : "none"}</code>, issued with this
          session. The register-views Server Action sends it as a bearer header on its GraphQL
          mutations and refuses to run without a session. It is stored on the session row as a
          server-owned field, so no response body ever carries it, not even this page&apos;s.
        </p>
        <form action={signOutAction}>
          <Button type="submit">Sign out</Button>
        </form>
      </Panel>
    </PageContainer>
  );
}
