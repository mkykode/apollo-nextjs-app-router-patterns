import { ImageResponse } from "next/og";

// Metadata file convention: this route becomes the og:image (and twitter:image) for the
// whole app, and the exports below become the image's metadata. Rendered on the server with
// Satori, so only flexbox-style CSS and absolute image URLs work in here.
export const alt = "Catstronauts: Apollo Client 4 patterns on the Next.js App Router";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "linear-gradient(135deg, #f25cc1 0%, #7156d9 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1 }}>Catstronauts</div>
      <div style={{ fontSize: 40, marginTop: 24, opacity: 0.9 }}>
        Apollo Client 4 on the Next.js App Router, six data-fetching patterns side by side
      </div>
    </div>,
    size,
  );
}
