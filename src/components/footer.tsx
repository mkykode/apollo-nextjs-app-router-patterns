import { ApolloIcon } from "./icons";
import styles from "./footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      2021 ©{" "}
      <span className={styles.logoContainer}>
        <ApolloIcon width="100px" height="40px" />
      </span>
    </footer>
  );
}
