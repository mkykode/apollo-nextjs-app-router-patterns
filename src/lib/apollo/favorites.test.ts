import { beforeEach, describe, expect, it } from "vitest";
import { favoriteTrackIdsVar, toggleFavorite } from "./favorites";

describe("favoriteTrackIdsVar", () => {
  beforeEach(() => favoriteTrackIdsVar([]));

  it("toggles ids in and out", () => {
    toggleFavorite("c_0");
    toggleFavorite("c_1");
    expect(favoriteTrackIdsVar()).toEqual(["c_0", "c_1"]);
    toggleFavorite("c_0");
    expect(favoriteTrackIdsVar()).toEqual(["c_1"]);
  });
});
