import { readFileSync, writeFileSync } from "node:fs";

import { ConfigSchema } from "../src/config-schema";

const packageJsonConfiguration = {
  title: "Custom Language Tools",
  properties: ConfigSchema.toJSONSchema({
    io: "input",
    override: (ctx) => {
      if (ctx.jsonSchema.type === "object") {
        ctx.jsonSchema.additionalProperties = false;
      }
    },
  }).properties,
};
const packageJson = JSON.parse(readFileSync("package.json", "utf-8")) as {
  contributes?: {
    configuration?: unknown;
  };
};

packageJson.contributes ??= {};
packageJson.contributes.configuration = packageJsonConfiguration;

writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
