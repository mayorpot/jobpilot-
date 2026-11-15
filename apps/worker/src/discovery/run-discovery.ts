
import { prisma } from "@jobpilot/db";
import { runJobDiscovery } from "./discovery.service.js";

async function main() {
  try {
    const greenhouseBoards = (
      process.env.JOBPILOT_GREENHOUSE_BOARDS ?? ""
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const leverSites = (
      process.env.JOBPILOT_LEVER_SITES ?? ""
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (greenhouseBoards.length === 0 && leverSites.length === 0) {
      throw new Error(
        "No employer boards configured. Set JOBPILOT_GREENHOUSE_BOARDS or JOBPILOT_LEVER_SITES."
      );
    }

    console.log("[job-discovery] Starting scheduled discovery...");

    const results = await runJobDiscovery();

    if (results.length === 0) {
      throw new Error(
        "Discovery finished without importing any successful employer boards."
      );
    }

    const totalFetched = results.reduce(
      (sum, result) => sum + Number(result.fetched ?? 0),
      0
    );

    const totalImported = results.reduce(
      (sum, result) => sum + Number(result.imported ?? 0),
      0
    );

    console.log("[job-discovery] Completed successfully.");
    console.log({
      boardsProcessed: results.length,
      totalFetched,
      totalImported,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("[job-discovery] Failed:", error);
  process.exitCode = 1;
});
