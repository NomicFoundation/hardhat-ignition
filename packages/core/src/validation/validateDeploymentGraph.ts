import { getSortedVertexIdsFrom } from "../graph/utils";
import { visit } from "../graph/visit";
import { Services } from "../services/types";
import { CallPoints, IDeploymentGraph } from "../types/deploymentGraph";
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
      new Map<number, null>(),
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
