import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/** Only the tags this app creates: `track:<id>`. Anything else is rejected. */
const TAG = /^track:[\w-]{1,64}$/;

const isAuthorized = (given: string | null, expected: string) =>
  given !== null &&
  given.length === expected.length &&
  timingSafeEqual(Buffer.from(given), Buffer.from(expected));

/**
 * On-demand revalidation from outside the app, the way a CMS or the GraphQL backend would
 * call a webhook after data changes: POST /api/revalidate?tag=track:c_1&secret=...
 *
 * revalidateTag with the "max" profile is stale-while-revalidate: the next request for a
 * page using that tag still gets the cached entry while a fresh one is fetched in the
 * background. Compare updateTag in the Server Action, which expires the entry so the very
 * next render waits for fresh data. Next 16 requires the profile argument.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 503 });
  }
  if (!isAuthorized(request.nextUrl.searchParams.get("secret"), secret)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }
  const tag = request.nextUrl.searchParams.get("tag");
  if (tag === null || !TAG.test(tag)) {
    return NextResponse.json({ error: "Expected tag=track:<id>" }, { status: 400 });
  }

  revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: tag });
}
