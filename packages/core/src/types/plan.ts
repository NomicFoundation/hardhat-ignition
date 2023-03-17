import type { IDeploymentGraph } from "./deploymentGraph";
import type { IExecutionGraph } from "./executionGraph";

export interface IgnitionPlan {
  deploymentGraph: IDeploymentGraph;
  executionGraph: IExecutionGraph;
}
