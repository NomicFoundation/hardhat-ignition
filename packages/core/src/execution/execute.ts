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
  _ui: UiService,
  _recipeResults: IgnitionRecipesResults
): Promise<VisitResult> {
  // const uiDeploymentState = setupUiDeploymentState(
  //   executionGraph,
  //   ui,
  //   orderedVertexIds
  // );

  return visitInBatches(executionGraph, { services }, executionDispatch);

  // return visit(
  //   "Execution",
  //   orderedVertexIds,
  //   executionGraph,
  //   { services },
  //   new Map<number, any>(),
  //   executionDispatch,
  //   (vertex, kind, error) => {
  //     if (kind === "success") {
  //       uiDeploymentState.setExeuctionVertexAsSuccess(vertex);
  //     } else if (kind === "failure") {
  //       uiDeploymentState.setExecutionVertexAsFailure(vertex, error);
  //     } else {
  //       throw new Error(`Unknown kind ${kind}`);
  //     }

  //     ui.render();
  //   }
  // );
}

// function setupUiDeploymentState(
//   executionGraph: IExecutionGraph,
//   ui: UiService,
//   orderedVertexIds: number[]
// ): DeploymentState {
//   const uiDeploymentState: DeploymentState = new DeploymentState();

//   uiDeploymentState.setExecutionVertexes(
//     orderedVertexIds
//       .map((vid) => executionGraph.vertexes.get(vid))
//       .filter((vertex): vertex is ExecutionVertex => vertex !== undefined)
//   );

//   ui.setDeploymentState(uiDeploymentState);

//   return uiDeploymentState;
// }
