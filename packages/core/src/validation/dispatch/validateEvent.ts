import type { EventVertex } from "../../types/deploymentGraph";
import type {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

import { ethers } from "ethers";

import {
  buildValidationError,
  resolveArtifactForCallableFuture,
  validateBytesForArtifact,
} from "./helpers";

export async function validateEvent(
  vertex: EventVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { callPoints, services }: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact({
    vertex,
    callPoints,
    services,
  });

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  let artifactAbi: any[] | undefined;
  if (typeof vertex.address === "string") {
    if (!ethers.utils.isAddress(vertex.address)) {
      return buildValidationError(
        vertex,
        `Invalid address ${vertex.address}`,
        callPoints
      );
    }

    artifactAbi = vertex.abi;
  } else if (vertex.address.type === "contract") {
    artifactAbi = await resolveArtifactForCallableFuture(vertex.address, {
      services,
    });

    if (artifactAbi === undefined) {
      return buildValidationError(
        vertex,
        `Contract with name '${vertex.address.label}' doesn't exist`,
        callPoints
      );
    }
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifactAbi ?? vertex.abi);

  const events = Object.entries(iface.events)
    .filter(([fname]) => fname === vertex.event)
    .map(([, fragment]) => fragment);

  const eventFragments = iface.fragments
    .filter((frag) => frag.name === vertex.event)
    .concat(events);

  if (eventFragments.length === 0) {
    const contractName = vertex.label.split("/")[0];

    return buildValidationError(
      vertex,
      `Contract '${contractName}' doesn't have an event ${vertex.event}`,
      callPoints
    );
  }

  const matchingEventFragments = eventFragments.filter(
    (f) => f.inputs.length >= argsLength
  );

  if (matchingEventFragments.length === 0) {
    if (eventFragments.length === 1) {
      const contractName = vertex.label.split("/")[0];

      return buildValidationError(
        vertex,
        `Event ${vertex.event} in contract ${contractName} expects ${eventFragments[0].inputs.length} arguments but ${argsLength} were given`,
        callPoints
      );
    } else {
      return buildValidationError(
        vertex,
        `Event ${vertex.event} in contract is overloaded, but no overload expects ${argsLength} arguments`,
        callPoints
      );
    }
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
