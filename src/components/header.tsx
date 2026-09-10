import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/space_cat_logo.png";
import { ACCOUNT_PATH } from "@/lib/auth/paths";
import { FavoritesCount } from "./favorites-count";
import { PatternNav } from "./pattern-nav";
import styles from "./header.module.css";

/** Top navigation: home button plus the pattern switcher. Server Component. */
export function Header() {
  return (
    // The header is the spatial anchor while pages slide: globals.css pins this name in place.
    <header className={styles.headerBar} style={{ viewTransitionName: "site-header" }}>
      <div className={styles.container}>
        <div className={styles.homeButtonContainer}>
          <Link href="/" className={styles.homeLink}>
            <div className={styles.homeButton}>
              <Image
                src={logo}
                alt=""
                width={60}
                height={60}
                className={styles.logo}
                loading="eager"
              />
              <div className={styles.title}>
                <h3>Catstronaut</h3>
                <div>Kitty space academy</div>
              </div>
            </div>
          </Link>
        </div>
        <PatternNav />
        <FavoritesCount />
        {/* A plain link: reading the session here would make every route dynamic. */}
        <Link href={ACCOUNT_PATH} className={styles.account}>
          Account
        </Link>
      </div>
    </header>
  );
}
