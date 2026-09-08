import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { trackHref } from "@/lib/patterns";
import { TrackCard } from "./track-card";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const track: TrackCard_TrackFragment = {
  __typename: "Track",
  id: "c_0",
  title: "Cat-stronomy, an introduction",
  thumbnail:
    "https://res.cloudinary.com/dety84pbu/image/upload/v1598465568/nebula_cat_djkt9r.jpg",
  length: 2377,
  modulesCount: 10,
  author: {
    __typename: "Author",
    id: "cat-1",
    name: "Henri, le Chat Noir",
    photo: "https://images.unsplash.com/photo-1442291928580-fb5d0856a8f1",
  },
};

const href = trackHref("rsc", track.id);

/** A promise the test resolves by hand, to observe ordering. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("TrackCard", () => {
  afterEach(() => {
    push.mockReset();
    vi.restoreAllMocks();
  });

  it("renders the track summary and links to the detail page", () => {
    render(<TrackCard track={track} href={href} onOpen={vi.fn(async () => undefined)} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/rsc/track/c_0");
    expect(screen.getByRole("heading", { name: /cat-stronomy/i })).toBeInTheDocument();
    expect(screen.getByText("Henri, le Chat Noir")).toBeInTheDocument();
    expect(screen.getByText("10 modules - 39m")).toBeInTheDocument();
  });

  it("waits for the increment, then navigates", async () => {
    const increment = deferred();
    const onOpen = vi.fn(() => increment.promise);
    render(<TrackCard track={track} href={href} onOpen={onOpen} />);
    const link = screen.getByRole("link");

    // fireEvent.click returns false when the handler called preventDefault (Link does not navigate).
    expect(fireEvent.click(link)).toBe(false);

    expect(onOpen).toHaveBeenCalledOnce();
    await waitFor(() => expect(link).toHaveAttribute("aria-busy", "true"));
    expect(push).not.toHaveBeenCalled();

    increment.resolve();

    await waitFor(() => expect(push).toHaveBeenCalledWith(href));
  });

  it("ignores clicks while an increment is in flight", async () => {
    const increment = deferred();
    const onOpen = vi.fn(() => increment.promise);
    render(<TrackCard track={track} href={href} onOpen={onOpen} />);
    const link = screen.getByRole("link");

    fireEvent.click(link);
    await waitFor(() => expect(link).toHaveAttribute("aria-busy", "true"));
    expect(fireEvent.click(link)).toBe(false);

    increment.resolve();
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("still navigates and logs when the increment fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onOpen = vi.fn(async () => {
      throw new Error("network down");
    });
    render(<TrackCard track={track} href={href} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("link"));

    await waitFor(() => expect(push).toHaveBeenCalledWith(href));
    expect(consoleError).toHaveBeenCalledWith(
      "Could not increment the track's view count",
      expect.any(Error),
    );
  });

  it("leaves modifier clicks to the browser", () => {
    const onOpen = vi.fn(async () => undefined);
    render(<TrackCard track={track} href={href} onOpen={onOpen} />);

    // Default not prevented: the browser (and Link) handle the new-tab navigation.
    expect(fireEvent.click(screen.getByRole("link"), { metaKey: true })).toBe(true);

    expect(onOpen).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });
});
