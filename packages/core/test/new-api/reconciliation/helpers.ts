import { assert } from "chai";

import { ModuleConstructor } from "../../../src/new-api/internal/module-builder";
import { Reconcilier } from "../../../src/new-api/internal/reconciliation/reconcilier";
import { ReconciliationResult } from "../../../src/new-api/internal/reconciliation/types";
import { ExecutionStateMap } from "../../../src/new-api/types/execution-state";
import {
  IgnitionModuleResult,
  ModuleParameters,
} from "../../../src/new-api/types/module";
import { IgnitionModuleDefinition } from "../../../src/new-api/types/module-builder";
import { exampleAccounts } from "../helpers";

export function reconcile(
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >,
  executionStateMap: ExecutionStateMap,
  moduleParameters: ModuleParameters = {}
): ReconciliationResult {
  const constructor = new ModuleConstructor();
  const module = constructor.construct(moduleDefinition);

  // overwrite the id with the execution state map, makes writing tests
  // less error prone
  const updatedExecutionStateMap = Object.fromEntries(
    Object.entries(executionStateMap).map(([key, exState]) => [
      key,
      { ...exState, id: key },
    ])
  );

  const reconiliationResult = Reconcilier.reconcile(
    module,
    updatedExecutionStateMap,
    moduleParameters,
    exampleAccounts
  );

  return reconiliationResult;
}

export function assertNoWarningsOrErrors(
  reconciliationResult: ReconciliationResult
) {
  assert.equal(
    reconciliationResult.reconciliationFailures.length,
    0,
    `Unreconcilied futures found: \n${JSON.stringify(
      reconciliationResult.reconciliationFailures,
      undefined,
      2
    )}`
  );
  assert.equal(
    reconciliationResult.missingExecutedFutures.length,
    0,
    `Missing futures found: \n${JSON.stringify(
      reconciliationResult.missingExecutedFutures,
      undefined,
      2
    )}`
  );
}

export function assertSuccessReconciliation(
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >,
  previousExecutionState: ExecutionStateMap
): void {
  const reconciliationResult = reconcile(
    moduleDefinition,
    previousExecutionState
  );

  assertNoWarningsOrErrors(reconciliationResult);
}
