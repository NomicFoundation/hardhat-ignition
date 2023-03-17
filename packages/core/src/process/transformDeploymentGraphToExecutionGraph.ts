import type {
  IDeploymentGraph,
  DeploymentGraphVertex,
} from "../types/deploymentGraph";
import type { ExecutionVertex, IExecutionGraph } from "../types/executionGraph";
import type { TransformResult } from "../types/process";
import type { Services } from "../types/services";

import { ExecutionGraph } from "../execution/ExecutionGraph";
import { clone } from "../graph/adjacencyList";

import { convertDeploymentVertexToExecutionVertex as convertDeploymentVertexToExecutionVertex } from "./transform/convertDeploymentVertexToExecutionVertex";
import { reduceDeploymentGraphByEliminatingVirtualVertexes } from "./transform/reduceDeploymentGraphByEliminatingVirtualVertexes";

export async function transformDeploymentGraphToExecutionGraph(
  deploymentGraph: IDeploymentGraph,
  services: Services
): Promise<TransformResult> {
  const reducedDeploymentGraph =
    reduceDeploymentGraphByEliminatingVirtualVertexes(deploymentGraph);

  const executionGraph: IExecutionGraph = await convertDeploymentToExecution(
    reducedDeploymentGraph,
    convertDeploymentVertexToExecutionVertex({
      services,
      graph: reducedDeploymentGraph,
    })
  );

  return { _kind: "success", executionGraph };
}

async function convertDeploymentToExecution(
  deploymentGraph: IDeploymentGraph,
  convert: (vertex: DeploymentGraphVertex) => Promise<ExecutionVertex>
) {
  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = clone(deploymentGraph.adjacencyList);

  for (const [id, deploymentVertex] of deploymentGraph.vertexes.entries()) {
    const executionVertex = await convert(deploymentVertex);

    executionGraph.vertexes.set(id, executionVertex);
  }

  return executionGraph;
}
