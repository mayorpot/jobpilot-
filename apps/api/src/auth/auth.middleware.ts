import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import {
  JWT_SECRET,
  SESSION_COOKIE_NAME
} from "./auth.config.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    const payload = jwt.verify(
      token,
      JWT_SECRET
    ) as jwt.JwtPayload;

    if (!payload.sub) {
      return res.status(401).json({
        error: "Invalid session"
      });
    }

    req.userId = payload.sub;

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired session"
    });
  }
}