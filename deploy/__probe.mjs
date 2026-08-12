import { env } from "prisma/config";

const viaEnv = env("DIRECT_URL");
const viaProcess = process.env.DIRECT_URL;

console.log(
  JSON.stringify(
    {
      env_helper: {
        type: typeof viaEnv,
        length: typeof viaEnv === "string" ? viaEnv.length : null,
        preview: typeof viaEnv === "string" ? viaEnv.slice(0, 50) : viaEnv,
      },
      process_env: {
        length: (viaProcess || "").length,
        preview: (viaProcess || "").slice(0, 50),
      },
      cwd: process.cwd(),
    },
    null,
    2,
  ),
);
