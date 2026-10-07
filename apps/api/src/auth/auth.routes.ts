import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "./auth.middleware.js";
import { prisma } from "@jobpilot/db";

import {
  loginUser,
  registerUser
} from "./auth.service.js";

import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS
} from "./auth.config.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters"
      });
    }

    const user = await registerUser(
      email,
      password,
      firstName,
      lastName
    );

    return res.status(201).json({
      user
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        error: "An account with this email already exists"
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Unable to create account"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const result = await loginUser(email, password);

    res.cookie(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS
    });

    return res.status(200).json({
      user: result.user
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Unable to login"
    });
  }
});

router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "User account not found",
      });
    }

    return res.json({ user });
  }
);

router.post("/logout", (_req, res) => {
  res.clearCookie("jobpilot_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(200).json({
    message: "Logged out successfully",
  });
});

export default router;