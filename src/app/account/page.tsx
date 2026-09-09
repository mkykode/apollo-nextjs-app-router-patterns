import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/button";
import { PageContainer } from "@/components/page-container";
import { Panel } from "@/components/panel";
import { signOutAction } from "@/lib/actions/auth";
import { auth } from "@/lib/auth/auth";
import { ACCOUNT_PATH, signInHref } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Account" };

/** Enough of the token to see it changes per sign-in, not enough to reuse it. */
const mask = (token: string) => `${token.slice(0, 8)}…`;

/**
 * The proxy already turned strangers away, but it only looked at a cookie. The page checks
 * again with auth(), next to the data it renders: the defense in depth the Next.js auth guide
 * asks for. auth() reads cookies, which makes the route dynamic; no segment config needed.
 */
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(signInHref(ACCOUNT_PATH));
  }

  return (
    <PageContainer>
      <Panel title="Mission control">
        {/* One template literal, so the HTML has one text node and can be checked as text. */}
        <p data-testid="signed-in-as">
          {`Signed in as ${session.user.name} (${session.user.email}).`}
        </p>
        <p>
          API token <code>{mask(session.accessToken)}</code>, issued at sign-in. The
          register-views Server Action sends it as a bearer header on its GraphQL mutations
          and refuses to run without a session.
        </p>
        <form action={signOutAction}>
          <Button type="submit">Sign out</Button>
        </form>
      </Panel>
    </PageContainer>
  );
}
