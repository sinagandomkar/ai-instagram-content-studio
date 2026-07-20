import { Composio } from "@composio/core";

/**
 * Instagram Graph API action slugs exposed by Composio's "instagram" toolkit,
 * confirmed live against docs.composio.dev on 2026-07-19 (deprecated
 * siblings — INSTAGRAM_GET_USER_MEDIA, INSTAGRAM_GET_POST_INSIGHTS,
 * INSTAGRAM_GET_POST_COMMENTS — intentionally excluded in favor of their
 * IG_* replacements).
 *
 * Parameter names below (ig_user_id, ig_media_id, metric, since/until,
 * after) are confirmed from Composio's published input schemas; the full
 * parameter list per action should still be re-checked with
 * `composio.tools.getRawComposioToolBySlug(slug)` before relying on a new
 * field, since Composio versions toolkit actions independently of this app.
 */
export const INSTAGRAM_ACTIONS = {
  getUserInfo: "INSTAGRAM_GET_USER_INFO",
  getUserInsights: "INSTAGRAM_GET_USER_INSIGHTS",
  getUserMedia: "INSTAGRAM_GET_IG_USER_MEDIA",
  getMediaInsights: "INSTAGRAM_GET_IG_MEDIA_INSIGHTS",
  getMediaComments: "INSTAGRAM_GET_IG_MEDIA_COMMENTS",
} as const;

let client: Composio | undefined;

/** Lazily-constructed singleton so the app boots even without COMPOSIO_API_KEY configured (isAvailable() just reports false). */
export function getComposioClient(): Composio | undefined {
  if (client) return client;
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) return undefined;
  client = new Composio({ apiKey });
  return client;
}

/**
 * V1 is single-local-user; this is the fixed Composio `userId` every
 * connected-account/tool-execute call is scoped to. Becomes a real per-user
 * id once multi-tenant auth ships (PRD §9).
 */
export const LOCAL_COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID ?? "local-user";

export const INSTAGRAM_TOOLKIT_SLUG = "instagram";
