import type { SVGProps } from "react";
import styles from "./icons.module.css";

type IconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  /** Rendered width and height in pixels. */
  size: number;
};

/** Line icons from Apollo space-kit, inlined so they render in Server Components. */
function LineIcon({
  size,
  viewBox,
  children,
  className,
  ...props
}: IconProps & { viewBox: string }) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ? `${styles.icon} ${className}` : styles.icon}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconRun(props: IconProps) {
  return (
    <LineIcon viewBox="0 0 40 40" {...props}>
      <path d="M3.897 5.425v29.15a2.5 2.5 0 0 0 3.681 2.203l27.205-14.575a2.5 2.5 0 0 0 0-4.406L7.578 3.222a2.5 2.5 0 0 0-3.681 2.203z" />
    </LineIcon>
  );
}

export function IconView(props: IconProps) {
  return (
    <LineIcon viewBox="0 0 24 24" {...props}>
      <path d="M12 5.251C7.969 5.183 3.8 8 1.179 10.885a1.663 1.663 0 0 0 0 2.226C3.743 15.935 7.9 18.817 12 18.748c4.1.069 8.258-2.813 10.824-5.637.57-.633.57-1.593 0-2.226C20.2 8 16.031 5.183 12 5.251z" />
      <path d="M15.75 12a3.75 3.75 0 1 1-7.5.004 3.75 3.75 0 0 1 7.5-.007V12z" />
    </LineIcon>
  );
}

export function IconTime(props: IconProps) {
  return (
    <LineIcon viewBox="0 0 24 24" {...props}>
      <path d="M12 1.5c5.799 0 10.5 4.701 10.5 10.5S17.799 22.5 12 22.5 1.5 17.799 1.5 12 6.201 1.5 12 1.5zM12 12V5.5" />
      <path d="M12 12h5.5" />
    </LineIcon>
  );
}

export function IconBook(props: IconProps) {
  return (
    <LineIcon viewBox="0 0 140 140" {...props}>
      <path d="M66.838 124.07a9.333 9.333 0 0 0 6.33 0 79.683 79.683 0 0 1 50.75-2.614 9.374 9.374 0 0 0 11.701-9.094V28.747a9.374 9.374 0 0 0-6.533-8.914A80.955 80.955 0 0 0 73.167 21a9.392 9.392 0 0 1-6.329 0 80.972 80.972 0 0 0-55.924-1.167 9.374 9.374 0 0 0-6.539 8.914v83.615a9.374 9.374 0 0 0 11.702 9.094 79.7 79.7 0 0 1 50.761 2.613zM70 21.477v103.145" />
    </LineIcon>
  );
}

export function ApolloIcon({
  width,
  height,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 979 293"
      width={width}
      height={height}
      fill="currentColor"
      fillRule="nonzero"
      role="img"
      aria-label="Apollo GraphQL"
      className={styles.icon}
      {...props}
    >
      <path d="M159.4 83.1H130L87.5 195.4h26.6l6.9-19h40.1l-7.3-21h-26.4l17.2-48.3 30.6 88.4h26.6zM606.3 195.3V83.1H630v91.2h46.6v21zM742.6 195.3V83.1h23.6v91.2h46.6v21zM475.4 103.2c19.5 0 35.5 16.2 35.5 36.1 0 19.9-15.9 36.1-35.5 36.1-19.5 0-35.4-16.2-35.4-36.1 0-19.9 15.9-36.1 35.4-36.1zm0-22c-31.5 0-57 26-57 58.1s25.5 58.1 57 58.1 57-26 57-58.1-25.5-58.1-57-58.1zM921.5 103.2c19.6 0 35.5 16.2 35.5 36.1 0 19.9-15.9 36.1-35.5 36.1-19.5 0-35.4-16.2-35.4-36.1-.1-19.9 15.8-36.1 35.4-36.1zm0-22c-31.5 0-57 26-57 58.1s25.5 58.1 57 58.1 57-26 57-58.1-25.5-58.1-57-58.1zM322 83.1h-51.4v112.3h23.5v-38.6H322c19.6 0 35.5-16.9 35.5-36.8 0-20.1-15.9-36.9-35.5-36.9zm0 51.6h-27.9V105H322c7.7 0 13.9 7 13.9 14.8 0 7.9-6.2 14.9-13.9 14.9z" />
      <path d="M250.4 229.4c-2 0-3.8 1-4.9 2.6 0 0-5.3 6.2-8.2 9.1-12.1 12.3-26.1 21.9-41.8 28.7-16.2 7-33.4 10.5-51.2 10.5-17.8 0-35-3.5-51.2-10.5-15.6-6.8-29.7-16.5-41.8-28.8-12.1-12.3-21.6-26.6-28.2-42.6-6.9-16.5-10.3-34-10.3-52.1s3.5-35.6 10.3-52.1c6.6-15.9 16.1-30.3 28.2-42.6 12.1-12.3 26.1-22 41.8-28.7 16.2-7 33.4-10.5 51.2-10.5 17.8 0 35 3.5 51.2 10.5 11.4 4.9 22 11.4 31.5 19.3-.5 1.5-.8 3.2-.8 4.9 0 8.3 6.6 15.1 14.8 15.1 8.2 0 14.8-6.8 14.8-15.1S249.2 32 241 32c-2 0-4 .4-5.7 1.2C210.5 12.5 178.8.1 144.3.1 65 .2.7 65.6.7 146.4c0 80.8 64.3 146.2 143.6 146.2 44.4 0 84-20.5 110.4-52.7 1.1-1.1 1.8-2.7 1.8-4.4-.1-3.4-2.8-6.1-6.1-6.1z" />
    </svg>
  );
}
