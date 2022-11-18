import setupDebug from "debug";

import { ExecutionGraph } from "execution/ExecutionGraph";
import { ExecuteBatchResult } from "execution/batch/types";
import { InMemoryJournal } from "journal/InMemoryJournal";
import { createServices } from "services/createServices";
import { Services } from "services/types";
import { DeployState, UpdateUiAction } from "types/deployment";
import { VertexVisitResult, VertexVisitResultFailure } from "types/graph";
import { ICommandJournal } from "types/journal";
import { Providers } from "types/providers";

import {
  DeployStateCommand,
  deployStateReducer,
  initializeDeployState,
  isDeployStateExecutionCommand,
} from "./deployStateReducer";

const log = setupDebug("ignition:deployment");

export class Deployment {
  public state: DeployState;
  public services: Services;
  public ui?: UpdateUiAction;
  private commandJournal: ICommandJournal;

  constructor(
    moduleName: string,
    services: Services,
    journal: ICommandJournal,
    ui?: UpdateUiAction
  ) {
    this.state = initializeDeployState(moduleName);
    this.services = services;
    this.commandJournal = journal;
    this.ui = ui;
  }

  public static setupServices(providers: Providers): Services {
    const journal = new InMemoryJournal();
    const serviceOptions = {
      providers,
      journal,
    };

    const services: Services = createServices(
      "moduleIdEXECUTE",
      "executorIdEXECUTE",
      serviceOptions
    );

    return services;
  }

  public setChainId(chainId: number) {
    return this._runDeploymentCommand(`ChainId resolved as '${chainId}'`, {
      type: "SET_CHAIN_ID",
      chainId,
    });
  }

  public setNetworkName(networkName: string) {
    return this._runDeploymentCommand(
      `NetworkName resolved as '${networkName}'`,
      {
        type: "SET_NETWORK_NAME",
        networkName,
      }
    );
  }

  public startValidation() {
    return this._runDeploymentCommand("Validate deployment graph", {
      type: "START_VALIDATION",
    });
  }

  public failValidation(errors: Error[]) {
    return this._runDeploymentCommand(
      [`Validation failed with errors`, errors],
      {
        type: "VALIDATION_FAIL",
        errors,
      }
    );
  }

  public transformComplete(executionGraph: ExecutionGraph) {
    return this._runDeploymentCommand(
      [`Transform complete`, [executionGraph]],
      {
        type: "TRANSFORM_COMPLETE",
        executionGraph,
      }
    );
  }

  public startExecutionPhase(executionGraph: ExecutionGraph) {
    return this._runDeploymentCommand("Starting Execution", {
      type: "START_EXECUTION_PHASE",
      executionGraph,
    });
  }

  public updateExecutionWithNewBatch(batch: Set<number>) {
    return this._runDeploymentCommand("Update execution with new batch", {
      type: "UPDATE_EXECUTION_WITH_NEW_BATCH",
      batch,
    });
  }

  public updateExecutionWithBatchResults(batchResult: ExecuteBatchResult) {
    return this._runDeploymentCommand(
      [`Update execution with batch results`, [batchResult]],
      {
        type: "UPDATE_EXECUTION_WITH_BATCH_RESULTS",
        batchResult,
      }
    );
  }

  public async updateCurrentBatchWithResult(
    vertexId: number,
    result: VertexVisitResult
  ) {
    return this._runDeploymentCommand(
      [`Update current with batch result for ${vertexId}`, [result]],
      {
        type: "UPDATE_CURRENT_BATCH_WITH_RESULT",
        vertexId,
        result,
      }
    );
  }

  public readExecutionErrors() {
    const errors = [...this.state.execution.errored].reduce(
      (acc: { [key: number]: VertexVisitResultFailure }, id) => {
        const result = this.state.execution.resultsAccumulator.get(id);

        if (
          result === undefined ||
          result === null ||
          result._kind === "success"
        ) {
          return acc;
        }

        acc[id] = result;

        return acc;
      },
      {}
    );

    return errors;
  }

  public hasUnstarted(): boolean {
    return this.state.execution.unstarted.size > 0;
  }

  public hasErrors(): boolean {
    return this.state.execution.errored.size > 0;
  }

  private async _runDeploymentCommand(
    logMessage: string | [string, any[]],
    command: DeployStateCommand
  ): Promise<void> {
    log.apply(this, typeof logMessage === "string" ? [logMessage] : logMessage);

    this.state = deployStateReducer(this.state, command);

    if (isDeployStateExecutionCommand(command)) {
      await this.commandJournal.record(command);
    }

    this._renderToUi(this.state);
  }

  private _renderToUi(state: DeployState) {
    if (this.ui === undefined) {
      return;
    }

    this.ui(state);
  }
}
