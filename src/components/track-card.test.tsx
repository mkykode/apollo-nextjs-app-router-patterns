import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { trackHref } from "@/lib/patterns";
import { TrackCard } from "./track-card";

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

describe("TrackCard", () => {
  it("renders the track summary and links to the detail page", () => {
    render(<TrackCard track={track} href={trackHref("rsc", "c_0")} onOpen={vi.fn()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/rsc/track/c_0");
    expect(screen.getByRole("heading", { name: /cat-stronomy/i })).toBeInTheDocument();
    expect(screen.getByText("Henri, le Chat Noir")).toBeInTheDocument();
    expect(screen.getByText("10 modules - 39m")).toBeInTheDocument();
  });

  it("reports when the card is opened", () => {
    const onOpen = vi.fn();
    render(<TrackCard track={track} href={trackHref("rsc", "c_0")} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("link"));

    expect(onOpen).toHaveBeenCalledOnce();
  });
});
