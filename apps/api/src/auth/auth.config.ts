import { requireEnv } from "../config/env.js";

export const JWT_SECRET = requireEnv("JWT_SECRET");

export const SESSION_COOKIE_NAME = "jobpilot_session";

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;