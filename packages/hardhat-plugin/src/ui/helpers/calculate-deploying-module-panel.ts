import chalk from "chalk";

import { UiState } from "../types";

export function calculateDeployingModulePanel(state: UiState): string {
  let deployingMessage = `Hardhat Ignition 🚀

${chalk.bold(`Deploying [ ${state.moduleName ?? "unknown"} ]`)}
`;

  if (state.warnings.length > 0) {
    deployingMessage += `\n${chalk.yellow(
      "Warning - previously executed futures are not in the module:"
    )}\n`;

    deployingMessage += state.warnings
      .map((futureId) => chalk.yellow(` - ${futureId}`))
      .join("\n");

    deployingMessage += "\n";
  }

  return deployingMessage;
}
