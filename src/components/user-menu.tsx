import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { ACCOUNT_PATH, SIGN_IN_PATH } from "@/lib/auth/paths";
import styles from "./header.module.css";

/**
 * Per-user UI in the shared header. auth() reads the request's cookie, so this cannot be part
 * of the static shell; rendered inside a Suspense boundary it streams in behind the fallback
 * on every navigation while the rest of the header stays prerendered. That is the case Cache
 * Components was built for: the `dynamic` branch cannot afford a session read in the root
 * layout because it would make every route dynamic.
 */
export async function UserMenu() {
  const session = await auth();
  if (!session?.user) {
    return (
      <Link href={SIGN_IN_PATH} className={styles.account} data-testid="user-menu">
        Sign in
      </Link>
    );
  }
  return (
    <Link href={ACCOUNT_PATH} className={styles.account} data-testid="user-menu">
      {session.user.name}
    </Link>
  );
}

/** What the static shell shows until the session streams in. */
export function UserMenuFallback() {
  return (
    <Link href={ACCOUNT_PATH} className={styles.account}>
      Account
    </Link>
  );
}
