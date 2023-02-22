import { Services } from "services/types";
import { DeployedContract } from "types/executionGraph";
import {
  ResultsAccumulator,
  VertexVisitResult,
  VertexResultEnum,
} from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeDeployedContract(
  { label, address, abi }: DeployedContract,
  _resultAccumulator: ResultsAccumulator,
  _: { services: Services }
): Promise<VertexVisitResult> {
  const resolve = resolveFrom(_resultAccumulator);

  const resolvedAddress = toAddress(resolve(address));

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: {
      name: label,
      abi,
      address: resolvedAddress,
    },
  };
}
