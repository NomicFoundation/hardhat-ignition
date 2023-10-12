import { StatusResult } from "@nomicfoundation/ignition-core";
import chalk from "chalk";

export function calculateDeploymentStatusDisplay(
  deploymentId: string,
  statusResult: StatusResult
): string {
  if (statusResult.started.length > 0) {
    return _calculateStartedButUnfinished(deploymentId, statusResult);
  }

  if (
    statusResult.timedOut.length > 0 ||
    statusResult.failed.length > 0 ||
    statusResult.held.length > 0
  ) {
    return _calculateFailed(deploymentId, statusResult);
  }

  return _calculateSuccess(deploymentId, statusResult);
}

function _calculateSuccess(deploymentId: string, statusResult: StatusResult) {
  let successText = `\n🚀 Deployment ${deploymentId} Complete\n\n`;

  if (Object.values(statusResult.contracts).length === 0) {
    successText += chalk.italic("No contracts were deployed");
  } else {
    successText += "Deployed Addresses\n\n";

    successText += Object.values(statusResult.contracts)
      .map((contract) => `${contract.id} - ${contract.address}`)
      .join("\n");
  }

  return successText;
}

function _calculateStartedButUnfinished(
  deploymentId: string,
  statusResult: StatusResult
) {
  let startedText = `\n⛔ Deployment ${deploymentId} has not fully completed, there are futures have started but not finished\n\n`;

  startedText += Object.values(statusResult.started)
    .map((futureId) => ` - ${futureId}`)
    .join("\n");

  return startedText;
}

function _calculateFailed(deploymentId: string, statusResult: StatusResult) {
  let failedExecutionText = `\n${toErrorResultHeading(
    deploymentId,
    statusResult
  )}\n`;

  const sections: string[] = [];

  if (statusResult.timedOut.length > 0) {
    let timedOutSection = `\nThere are timed-out futures:\n`;

    timedOutSection += Object.values(statusResult.timedOut)
      .map(({ futureId }) => ` - ${futureId}`)
      .join("\n");

    timedOutSection +=
      "\n\nConsider increasing the fee in your config.\nCheck out the docs to learn more: <LINK>";

    sections.push(timedOutSection);
  }

  if (statusResult.failed.length > 0) {
    let failedSection = `\nThere are failed futures:\n`;

    failedSection += Object.values(statusResult.failed)
      .map(
        ({ futureId, networkInteractionId, error }) =>
          ` - ${futureId}/${networkInteractionId}: ${error}`
      )
      .join("\n");

    sections.push(failedSection);
  }

  if (statusResult.held.length > 0) {
    let heldSection = `\nThere are futures that the strategy held:\n`;

    heldSection += Object.values(statusResult.held)
      .map(
        ({ futureId, heldId, reason }) => ` - ${futureId}/${heldId}: ${reason}`
      )
      .join("\n");

    sections.push(heldSection);
  }

  failedExecutionText += sections.join("\n");

  return failedExecutionText;
}

function toErrorResultHeading(
  deploymentId: string,
  statusResult: StatusResult
): string {
  const didTimeout = statusResult.timedOut.length > 0;
  const didFailed = statusResult.failed.length > 0;
  const didHeld = statusResult.held.length > 0;

  let reasons = "";
  if (didTimeout && didFailed && didHeld) {
    reasons = "timeouts, failures and holds";
  } else if (didTimeout && didFailed) {
    reasons = "timeouts and failures";
  } else if (didFailed && didHeld) {
    reasons = "failures and holds";
  } else if (didTimeout && didHeld) {
    reasons = "timeouts and holds";
  } else if (didTimeout) {
    reasons = "timeouts";
  } else if (didFailed) {
    reasons = "failures";
  } else if (didHeld) {
    reasons = "holds";
  }

  return `⛔ Deployment ${deploymentId} did not complete as there were ${reasons}`;
}
