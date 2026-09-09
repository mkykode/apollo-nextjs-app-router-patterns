import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/assets/space_cat_logo.png";
import { FavoritesCount } from "./favorites-count";
import { PatternNav, PatternNavLinks } from "./pattern-nav";
import { UserMenu, UserMenuFallback } from "./user-menu";
import styles from "./header.module.css";

/** Top navigation: home button plus the pattern switcher. Server Component. */
export function Header() {
  return (
    <header className={styles.headerBar}>
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
        {/* The pathname is runtime data: stream the active state in, prerender the links. */}
        <Suspense fallback={<PatternNavLinks pathname="/" />}>
          <PatternNav />
        </Suspense>
        <FavoritesCount />
        {/* The session is request data too: the shell shows a link, the user streams in. */}
        <Suspense fallback={<UserMenuFallback />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
