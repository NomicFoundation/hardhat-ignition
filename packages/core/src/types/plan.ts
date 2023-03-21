import { IExecutionGraph } from "../internal/types/executionGraph";

import { IDeploymentGraph } from "./deploymentGraph";

export interface IgnitionPlan {
  deploymentGraph: IDeploymentGraph;
  executionGraph: IExecutionGraph;
}
