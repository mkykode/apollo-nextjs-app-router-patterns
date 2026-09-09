import Link from "next/link";
import { signInHref } from "@/lib/auth/paths";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * Shown in place of the Server Action form when there is no session. The action checks the
 * session itself; this prompt only saves a round trip that would fail.
 */
export function SignInPrompt({ callbackUrl }: { callbackUrl: string }) {
  return (
    <ContentSection>
      <div className={styles.form} data-testid="sign-in-prompt">
        <p className={styles.label}>
          Registering views through the Server Action needs a signed-in user: the action
          reads the session with auth() and forwards its token to the API.
        </p>
        <Link href={signInHref(callbackUrl)}>
          <Button>Sign in to register views</Button>
        </Link>
      </div>
    </ContentSection>
  );
}
