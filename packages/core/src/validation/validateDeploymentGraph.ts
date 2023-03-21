import { getSortedVertexIdsFrom } from "../internal/graph/utils";
import { visit } from "../internal/graph/visit";
import {
  CallPoints,
  IDeploymentGraph,
} from "../internal/types/deploymentGraph";
import { Services } from "../internal/types/services";
import { ValidationVisitResult } from "../types/validation";
import { IgnitionError } from "../utils/errors";

import { validationDispatch } from "./dispatch/validationDispatch";

export async function validateDeploymentGraph(
  deploymentGraph: IDeploymentGraph,
  callPoints: CallPoints,
  services: Services
): Promise<ValidationVisitResult> {
  try {
    const orderedVertexIds = getSortedVertexIdsFrom(deploymentGraph);

    return await visit(
      "Validation",
      orderedVertexIds,
      deploymentGraph,
      { services, callPoints },
      new Map<number, undefined>(),
      validationDispatch
    );
  } catch (err) {
    if (!(err instanceof Error)) {
      return {
        _kind: "failure",
        failures: [
          "Unsuccessful module validation",
          [new IgnitionError("Unknown validation error")],
        ],
      };
    }

    return {
      _kind: "failure",
      failures: ["Unsuccessful module validation", [err]],
    };
  }
}
