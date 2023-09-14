import { SerializedIgnitionModule } from "@ignored/ignition-core";
import { ensureDir, pathExists, readFile, writeFile } from "fs-extra";
import path from "path";

export async function writeVisualization(
  visualizationPayload: { module: SerializedIgnitionModule },
  { cacheDir }: { cacheDir: string }
) {
  const templateDir = path.join(
    require.resolve("@ignored/ignition-ui/package.json"),
    "../dist"
  );

  const templateDirExists = await pathExists(templateDir);

  if (!templateDirExists) {
    console.warn(`Unable to find template directory: ${templateDir}`);
    process.exit(1);
  }

  const visualizationDir = path.join(cacheDir, "visualization");

  await ensureDir(visualizationDir);

  const indexHtml = await readFile(path.join(templateDir, "index.html"));
  const updatedHtml = indexHtml
    .toString()
    .replace('{"unloaded":true}', JSON.stringify(visualizationPayload));

  await writeFile(path.join(visualizationDir, "index.html"), updatedHtml);
}
