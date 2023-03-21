import { IDeploymentGraph } from "../internal/types/deploymentGraph";
import { IExecutionGraph } from "../internal/types/executionGraph";

export interface IgnitionPlan {
  deploymentGraph: IDeploymentGraph;
  executionGraph: IExecutionGraph;
}
