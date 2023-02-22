import { isAddress } from "@ethersproject/address";

import { Services } from "services/types";
import { DeployedContractDeploymentVertex } from "types/deploymentGraph";
import {
  ResultsAccumulator,
  VertexResultEnum,
  VertexVisitResult,
} from "types/graph";
import { IgnitionError } from "utils/errors";

export async function validateDeployedContract(
  vertex: DeployedContractDeploymentVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  if (typeof vertex.address === "string" && !isAddress(vertex.address)) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(
        `The existing contract ${vertex.label} has an invalid address ${vertex.address}`
      ),
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined as any,
  };
}
