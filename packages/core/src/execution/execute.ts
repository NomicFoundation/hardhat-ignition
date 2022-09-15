import { Services } from "services/types";
import { IgnitionRecipesResults } from "types/deployment";
import { IExecutionGraph } from "types/executionGraph";
import { VisitResult } from "types/graph";
import { UiService } from "ui/ui-service";

import { visitInBatches } from "./batch/visitInBatches";
import { executionDispatch } from "./dispatch/executionDispatch";

export async function execute(
  executionGraph: IExecutionGraph,
  services: Services,
  ui: UiService,
  _recipeResults: IgnitionRecipesResults
): Promise<VisitResult> {
  return visitInBatches(executionGraph, { services }, ui, executionDispatch);
}
