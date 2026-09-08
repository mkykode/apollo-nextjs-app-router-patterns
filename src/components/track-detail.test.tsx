import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TrackDetail_TrackFragment } from "@/__generated__/graphql";
import { TrackDetail } from "./track-detail";

const track: TrackDetail_TrackFragment = {
  __typename: "Track",
  id: "c_0",
  title: "Cat-stronomy, an introduction",
  description: "# Pulchra vehi vidit misera sola armenta secabatur",
  thumbnail:
    "https://res.cloudinary.com/dety84pbu/image/upload/v1598465568/nebula_cat_djkt9r.jpg",
  length: 2377,
  modulesCount: 10,
  numberOfViews: 51,
  author: {
    __typename: "Author",
    id: "cat-1",
    name: "Henri, le Chat Noir",
    photo: "https://images.unsplash.com/photo-1442291928580-fb5d0856a8f1",
  },
  modules: [
    { __typename: "Module", id: "l_0", title: "Exploring Time and Space", length: 258 },
    { __typename: "Module", id: "l_1", title: "Cat Fusion", length: 3660 },
  ],
};

describe("TrackDetail", () => {
  it("renders details, author, modules and markdown description", () => {
    render(<TrackDetail track={track} />);

    expect(screen.getByRole("heading", { level: 1, name: track.title })).toBeInTheDocument();
    expect(screen.getByText("51 view(s)")).toBeInTheDocument();
    expect(screen.getByText("10 modules")).toBeInTheDocument();
    expect(screen.getByText("39m")).toBeInTheDocument();
    expect(screen.getByText("Henri, le Chat Noir")).toBeInTheDocument();
    expect(screen.getByText("Exploring Time and Space")).toBeInTheDocument();
    expect(screen.getByText("1h 1m")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /pulchra vehi vidit/i }),
    ).toBeInTheDocument();
  });
});
