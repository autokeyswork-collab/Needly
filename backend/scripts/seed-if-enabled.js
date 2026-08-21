const { spawnSync } = require("child_process");

if (process.env.AUTO_SEED_DEMO !== "true") {
  console.log("AUTO_SEED_DEMO is not true; skipping demo seed.");
  process.exit(0);
}

console.log("AUTO_SEED_DEMO=true; seeding demo data.");
const result = spawnSync("npm", ["run", "seed"], {
  cwd: __dirname + "/..",
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status || 0);
