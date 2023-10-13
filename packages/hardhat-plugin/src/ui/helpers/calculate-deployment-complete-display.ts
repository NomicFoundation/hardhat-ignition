import {
  DeploymentCompleteEvent,
  DeploymentResultType,
  ExecutionErrorDeploymentResult,
  PreviousRunErrorDeploymentResult,
  ReconciliationErrorDeploymentResult,
  SuccessfulDeploymentResult,
  ValidationErrorDeploymentResult,
} from "@nomicfoundation/ignition-core";
import chalk from "chalk";

export function calculateDeploymentCompleteDisplay(
  event: DeploymentCompleteEvent,
  { moduleName: givenModuleName }: { moduleName: string | null }
): string {
  const moduleName = givenModuleName ?? "unknown";

  switch (event.result.type) {
    case DeploymentResultType.SUCCESSFUL_DEPLOYMENT: {
      return _displaySuccessfulDeployment(event.result, { moduleName });
    }
    case DeploymentResultType.VALIDATION_ERROR: {
      return _displayValidationErrors(event.result, { moduleName });
    }
    case DeploymentResultType.RECONCILIATION_ERROR: {
      return _displayReconciliationErrors(event.result, { moduleName });
    }
    case DeploymentResultType.PREVIOUS_RUN_ERROR: {
      return _displayPreviousRunErrors(event.result, { moduleName });
    }
    case DeploymentResultType.EXECUTION_ERROR: {
      return _displayExecutionErrors(event.result, { moduleName });
    }
  }
}

function _displaySuccessfulDeployment(
  result: SuccessfulDeploymentResult,
  { moduleName }: { moduleName: string }
): string {
  let text = `
[ ${moduleName} ] successfully deployed 🚀

${chalk.bold("Deployed Addresses")}

`;

  const deployedContracts = Object.values(result.contracts);

  if (deployedContracts.length > 0) {
    text += deployedContracts
      .map((contract) => `${contract.id} - ${contract.address}`)
      .join("\n");
  } else {
    text += `${chalk.italic("No contracts were deployed")}`;
  }

  return text;
}

function _displayValidationErrors(
  result: ValidationErrorDeploymentResult,
  { moduleName }: { moduleName: string }
): string {
  let text = `
[ ${moduleName} ] validation failed ⛔

`;

  text += Object.entries(result.errors)
    .map(([futureId, errors]) => {
      let futureSection = `${futureId} errors:\n`;

      futureSection += errors.map((error) => ` - ${error}`).join("\n");

      return futureSection;
    })
    .join("\n\n");

  return text;
}

function _displayReconciliationErrors(
  result: ReconciliationErrorDeploymentResult,
  { moduleName }: { moduleName: string }
): string {
  let text = `
[ ${moduleName} ] reconciliation failed ⛔

`;

  text += Object.entries(result.errors)
    .map(([futureId, errors]) => {
      let errorSection = `${futureId} errors:\n`;

      errorSection += errors.map((error) => ` - ${error}`).join("\n");

      return errorSection;
    })
    .join("\n\n");

  return text;
}

function _displayPreviousRunErrors(
  result: PreviousRunErrorDeploymentResult,
  { moduleName }: { moduleName: string }
): string {
  let text = `\n[ ${moduleName} ] deployment cancelled ⛔\n\n`;

  text += `These futures failed or timed out on a previous run:\n`;

  text += Object.keys(result.errors)
    .map((futureId) => ` - ${futureId}`)
    .join("\n");

  text += `\n\nUse the ${chalk.italic(
    "wipe"
  )} task to reset them.\nCheck out the docs to learn more: <LINK>`;

  return text;
}

function _displayExecutionErrors(
  result: ExecutionErrorDeploymentResult,
  { moduleName }: { moduleName: string }
) {
  const sections: string[] = [];

  let text = `\n[ ${moduleName} ] failed ⛔\n\n`;

  if (result.timedOut.length > 0) {
    let timedOutSection = `Transaction remains unconfirmed after fee bump:\n`;

    timedOutSection += Object.values(result.timedOut)
      .map(({ futureId }) => ` - ${futureId}`)
      .join("\n");

    timedOutSection +=
      "\n\nConsider increasing the fee in your config.\nCheck out the docs to learn more: <LINK>";

    sections.push(timedOutSection);
  }

  if (result.failed.length > 0) {
    let failedSection = `Failures:\n`;

    failedSection += Object.values(result.failed)
      .map(
        ({ futureId, networkInteractionId, error }) =>
          ` - ${futureId}/${networkInteractionId}: ${error}`
      )
      .join("\n");

    sections.push(failedSection);
  }

  if (result.held.length > 0) {
    let heldSection = `Held:\n`;

    heldSection += Object.values(result.held)
      .map(
        ({ futureId, heldId, reason }) => ` - ${futureId}/${heldId}: ${reason}`
      )
      .join("\n");

    sections.push(heldSection);
  }

  text += sections.join("\n\n");

  return text;
}