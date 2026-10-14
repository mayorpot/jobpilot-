import "dotenv/config";

import app from "./app.js";

const parsedPort = Number(process.env.PORT);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JobPilot API running on http://0.0.0.0:${PORT}`);
});