const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(__dirname, ".env"), "utf-8");
    const vars = {};
    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      vars[key] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

const envFromFile = loadEnv();

const baseEnv = {
  NODE_ENV: "production",
  ...envFromFile,
};

module.exports = {
  apps: [
    {
      name: "colacop-server",
      cwd: __dirname,
      script: "./node_modules/.bin/tsx",
      args: "src/server/index.ts",
      instances: 1,
      exec_mode: "fork",
      env: baseEnv,
    },
    {
      name: "colacop-worker",
      cwd: __dirname,
      script: "./node_modules/.bin/tsx",
      args: "src/worker/index.ts",
      instances: 1,
      exec_mode: "fork",
      env: baseEnv,
    },
  ],
};
