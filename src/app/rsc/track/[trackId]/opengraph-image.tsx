import { ImageResponse } from "next/og";
import { GetTrackDocument } from "@/__generated__/graphql";
import { query } from "@/lib/apollo/rsc-client";

/**
 * A per-route Open Graph image. This is a Route Handler, not a React render: the RSC client
 * still works (React cache() simply memoizes nothing here), so the image can carry the
 * track's real title, author, and thumbnail.
 */
export const alt = "Track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const { data } = await query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" });
  const { title, author, thumbnail, modulesCount } = data.track;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#191c23",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 64, width: 700 }}>
        <div style={{ fontSize: 28, color: "#f25cc1", letterSpacing: 4 }}>CATSTRONAUTS</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>{title}</div>
        {/* Satori wants a single text child per box unless the box is display: flex. */}
        <div style={{ fontSize: 32, marginTop: 24, color: "#b2b9c3" }}>
          {`by ${author.name} · ${modulesCount ?? 0} modules`}
        </div>
      </div>
      {thumbnail ? (
        // Satori renders plain img tags; next/image has no meaning here.
        <img src={thumbnail} alt="" width={500} height={630} style={{ objectFit: "cover" }} />
      ) : null}
    </div>,
    size,
  );
}
