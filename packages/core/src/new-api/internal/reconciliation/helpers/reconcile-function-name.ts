import {
  NamedContractCallFuture,
  NamedStaticCallFuture,
} from "../../../types/module";
import {
  CallExecutionState,
  StaticCallExecutionState,
} from "../../new-execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileFunctionName(
  future:
    | NamedContractCallFuture<string, string>
    | NamedStaticCallFuture<string, string>,
  exState: CallExecutionState | StaticCallExecutionState,
  _context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  return compare(
    future,
    "Function name",
    exState.functionName,
    future.functionName
  );
}
