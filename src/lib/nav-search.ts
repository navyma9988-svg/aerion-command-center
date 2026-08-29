/** Default search params for each route, so <Link> calls stay type-complete. */
export const DEFAULT_SEARCH: Record<string, Record<string, string>> = {
  "/": {},
  "/queue": { action: "", tab: "all" },
  "/map": { focus: "", terminal: "", layer: "gates" },
  "/alerts": { item: "", status: "open", severity: "", terminal: "", runway: "" },
  "/brief": {},
};
