import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/space_cat_logo.png";
import { PatternNav } from "./pattern-nav";
import styles from "./header.module.css";

/** Top navigation: home button plus the pattern switcher. Server Component. */
export function Header() {
  return (
    <header className={styles.headerBar}>
      <div className={styles.container}>
        <div className={styles.homeButtonContainer}>
          <Link href="/" className={styles.homeLink}>
            <div className={styles.homeButton}>
              <Image src={logo} alt="" width={60} height={60} className={styles.logo} />
              <div className={styles.title}>
                <h3>Catstronaut</h3>
                <div>Kitty space academy</div>
              </div>
            </div>
          </Link>
        </div>
        <PatternNav />
      </div>
    </header>
  );
}
