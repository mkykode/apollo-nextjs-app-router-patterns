import { describe, expect, it } from "vitest";
import { filterTracks, paginate, parseSearch, searchHref } from "./search";

const tracks = [
  { id: "1", title: "Cat-stronomy", author: { name: "Henri" } },
  { id: "2", title: "Kitty space suit", author: { name: "Scratchy" } },
  { id: "3", title: "Rover driving", author: { name: "Grumpy Cat" } },
];

describe("parseSearch", () => {
  it("trims the query, defaults the page, and takes the first of repeated params", () => {
    expect(parseSearch({})).toEqual({ query: "", page: 1 });
    expect(parseSearch({ query: "  cat ", page: "3" })).toEqual({ query: "cat", page: 3 });
    expect(parseSearch({ query: ["a", "b"], page: ["2"] })).toEqual({ query: "a", page: 2 });
    expect(parseSearch({ page: "0" }).page).toBe(1);
    expect(parseSearch({ page: "abc" }).page).toBe(1);
  });
});

describe("filterTracks", () => {
  it("matches title or author, case-insensitively, and returns everything for an empty query", () => {
    expect(filterTracks(tracks, "CAT").map((t) => t.id)).toEqual(["1", "3"]);
    expect(filterTracks(tracks, "kitty").map((t) => t.id)).toEqual(["2"]);
    expect(filterTracks(tracks, "  ")).toBe(tracks);
  });
});

describe("paginate", () => {
  it("slices by page and clamps out-of-range pages", () => {
    expect(paginate(tracks, 1, 2)).toEqual({ items: tracks.slice(0, 2), page: 1, totalPages: 2 });
    expect(paginate(tracks, 2, 2)).toEqual({ items: tracks.slice(2), page: 2, totalPages: 2 });
    expect(paginate(tracks, 9, 2).page).toBe(2);
    expect(paginate([], 1, 2)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});

describe("searchHref", () => {
  it("omits defaults so the canonical URL stays clean", () => {
    expect(searchHref("/rsc", { query: "", page: 1 })).toBe("/rsc");
    expect(searchHref("/rsc", { query: "cat", page: 1 })).toBe("/rsc?query=cat");
    expect(searchHref("/rsc", { query: "cat", page: 2 })).toBe("/rsc?query=cat&page=2");
  });
});
