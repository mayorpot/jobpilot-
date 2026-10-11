import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRouter from "./auth/auth.routes.js";
import candidateRouter from "./candidate/candidate.routes.js";
import healthRouter from "./routes/health.routes.js";
import resumeRouter from "./resume/resume.routes.js";
import jobsRouter from "./jobs/jobs.routes.js";
import matchesRouter from "./matches/matches.routes.js";

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
app.use("/jobs", jobsRouter);
app.use("/matches", matchesRouter);

export default app;