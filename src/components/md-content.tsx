import Markdown from "react-markdown";
import styles from "./md-content.module.css";

/** Styled markdown, rendered on the server. */
export function MarkdownContent({ content }: { content: string | null }) {
  return (
    <div className={styles.markdown}>
      <Markdown>{content}</Markdown>
    </div>
  );
}
