import { ArgValue } from "types/executionGraph";
import { ResultsAccumulator } from "types/graph";
import { IgnitionError } from "utils/errors";
import { isDependable, isEventParam, isProxy } from "utils/guards";

export function toAddress(v: any) {
  if (typeof v === "object" && "address" in v) {
    return v.address;
  }

  return v;
}

export function resolveFrom(context: ResultsAccumulator) {
  return (arg: ArgValue) => resolveFromContext(context, arg);
}

function resolveFromContext(context: ResultsAccumulator, arg: ArgValue): any {
  if (isProxy(arg)) {
    return resolveFromContext(context, arg.value);
  }

  if (!isDependable(arg) && !isEventParam(arg)) {
    return arg;
  }

  const entry = context.get(arg.vertexId);

  if (!entry) {
    throw new IgnitionError(
      `No context entry for ${arg.vertexId} (${arg.label})`
    );
  }

  if (entry._kind === "failure") {
    throw new IgnitionError(
      `Looking up context on a failed vertex - violation of constraint`
    );
  }

  if (entry._kind === "hold") {
    throw new IgnitionError(
      `Looking up context on a on hold - violation of constraint`
    );
  }

  if (isEventParam(arg) && "topics" in entry.result) {
    return entry.result.topics[arg.label];
  }

  return entry.result;
}
