import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRouter from "./auth/auth.routes.js";
import candidateRouter from "./candidate/candidate.routes.js";
import healthRouter from "./routes/health.routes.js";
import resumeRouter from "./resume/resume.routes.js";

const app = express();

// ---------------------------------------------------------------------------
// Security & parsing middleware
// ---------------------------------------------------------------------------
app.use(helmet());

app.use(
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/candidate", candidateRouter);
app.use("/resumes", resumeRouter);

export default app;