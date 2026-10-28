import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRegion, regionName, watchOptions } from "./providers.ts";

const raw = {
  results: {
    UZ: {
      link: "https://www.themoviedb.org/movie/157336-interstellar/watch?locale=UZ",
      flatrate: [
        { provider_id: 2, provider_name: "Second", logo_path: "/b.jpg", display_priority: 5 },
        { provider_id: 1, provider_name: "First", logo_path: "/a.jpg", display_priority: 1 },
        { provider_id: 1, provider_name: "First", logo_path: "/a.jpg", display_priority: 1 },
      ],
      rent: [{ provider_id: 3, provider_name: "Rental", logo_path: null }],
      buy: [],
    },
    US: { link: "javascript:alert(1)", buy: [{ provider_id: 9, provider_name: "Shop", logo_path: "/s.jpg" }] },
    DE: { link: "https://www.themoviedb.org/x" },
  },
};

test("groups providers in order, sorted by priority, without duplicates", () => {
  const o = watchOptions(raw, "UZ");
  assert.deepEqual(o?.groups.map((g) => g.label), ["Stream", "Rent"]);
  assert.deepEqual(o?.groups[0].providers, [
    { id: 1, name: "First", logoUrl: "https://image.tmdb.org/t/p/w92/a.jpg" },
    { id: 2, name: "Second", logoUrl: "https://image.tmdb.org/t/p/w92/b.jpg" },
  ]);
  assert.equal(o?.groups[1].providers[0].logoUrl, null);
  assert.equal(o?.link, "https://www.themoviedb.org/movie/157336-interstellar/watch?locale=UZ");
});

test("unknown regions, empty regions and unsafe links", () => {
  assert.equal(watchOptions(raw, "FR"), null);
  assert.equal(watchOptions(raw, "DE"), null, "a region with no providers shows nothing");
  assert.equal(watchOptions({}, "UZ"), null);
  assert.equal(watchOptions(raw, "US")?.link, null, "only TMDB links are kept");
});

test("region setting", () => {
  assert.equal(normalizeRegion(undefined), "UZ");
  assert.equal(normalizeRegion(" us "), "US");
  assert.equal(normalizeRegion("USA"), "UZ");
  assert.equal(normalizeRegion("../x", "GB"), "GB");
  assert.equal(regionName("UZ"), "Uzbekistan");
});
