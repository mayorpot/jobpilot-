console.log("JobPilot worker started");

const runWorker = async () => {
  console.log(
    `[${new Date().toISOString()}] Worker heartbeat`
  );
};

await runWorker();