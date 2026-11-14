import { cp, mkdir } from "node:fs/promises";

const destination = new URL("../packages/cli/dist/assets/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const directory of ["skills", "templates"]) {
  await cp(new URL(`../${directory}/`, import.meta.url), new URL(`${directory}/`, destination), {
    recursive: true,
    filter: (source) => !source.includes("__pycache__"),
  });
}
await mkdir(new URL("licenses/", destination), { recursive: true });
await cp(
  new URL("../packages/core/node_modules/zod/LICENSE", import.meta.url),
  new URL("licenses/zod.LICENSE", destination),
);
await cp(
  new URL("../LICENSE", import.meta.url),
  new URL("licenses/VibeStartKit.LICENSE", destination),
);
