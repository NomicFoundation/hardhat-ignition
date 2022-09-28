import { render } from "ink";
import React from "react";

import { ExecutionGraph } from "execution/ExecutionGraph";
import { ExecuteBatchResult } from "execution/batch/types";

import { IgnitionUi } from "./components";
import { DeploymentState, UiVertex, UiVertexStatus } from "./types";
import { VertexVisitResultFailure } from "types/graph";

export class UiService {
  private _enabled: boolean;
  private _deploymentState: DeploymentState;
  private _executionGraph: ExecutionGraph | undefined;

  constructor({
    recipeName,
    enabled,
  }: {
    recipeName: string;
    enabled: boolean;
  }) {
    this._enabled = enabled;
    this._deploymentState = new DeploymentState({ recipeName });
  }

  public startExecutionPhase(executionGraph: ExecutionGraph) {
    this._deploymentState.startExecutionPhase();
    this._executionGraph = executionGraph;

    this.render();
  }

  public failExecutionPhaseWith(errors: {
    [key: number]: VertexVisitResultFailure;
  }) {
    this._deploymentState.endExecutionPhase("failed", errors);

    this.render();
  }

  public completeExecutionPhase() {
    this._deploymentState.endExecutionPhase("complete");

    this.render();
  }

  public setBatch(
    batchCount: number,
    batch: Set<number>,
    executeBatchResult?: ExecuteBatchResult
  ) {
    const vertexes: UiVertex[] = [...batch].map((id) => ({
      id,
      label: this._executionGraph?.vertexes.get(id)?.label ?? "ua",
      status: this._resolveVertexStatus(id, executeBatchResult),
    }));

    this._deploymentState.setBatch(batchCount, { batchCount, vertexes });

    this.render();
  }

  private _resolveVertexStatus(
    vertexId: number,
    executeBatchResult?: ExecuteBatchResult
  ): UiVertexStatus {
    if (executeBatchResult === undefined) {
      return "RUNNING";
    }

    if (executeBatchResult.completed.has(vertexId)) {
      return "COMPELETED";
    }

    if (executeBatchResult.errored.has(vertexId)) {
      return "ERRORED";
    }

    if (executeBatchResult.onhold.has(vertexId)) {
      return "HELD";
    }

    return "RUNNING";
  }

  public render() {
    if (this._deploymentState === undefined) {
      throw new Error("Cannot render before deployment state set");
    }

    if (this._enabled) {
      render(<IgnitionUi deploymentState={this._deploymentState} />);
    }
  }
}
