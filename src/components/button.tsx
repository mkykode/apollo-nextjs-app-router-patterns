import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

/** Large raised pink button, matching the space-kit Button the app used before. */
export function Button({ icon, children, className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={className ? `${styles.button} ${className}` : styles.button}
      {...props}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {children}
    </button>
  );
}
