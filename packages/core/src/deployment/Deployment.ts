import setupDebug from "debug";

import { ExecutionGraph } from "execution/ExecutionGraph";
import { InMemoryJournal } from "journal/InMemoryJournal";
import { createServices } from "services/createServices";
import { Services } from "services/types";
import {
  DeployState,
  UpdateUiAction,
  DeployStateCommand,
  DeployStateExecutionCommand,
} from "types/deployment";
import { VertexVisitResult, VertexVisitResultFailure } from "types/graph";
import { ICommandJournal } from "types/journal";
import { Providers } from "types/providers";

import {
  initializeDeployState,
  deployStateReducer,
} from "./deployStateReducer";
import { isDeployStateExecutionCommand } from "./utils";

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

  public async load(
    commandStream: AsyncGenerator<DeployStateExecutionCommand, void, unknown>
  ) {
    log("Loading from journal");

    for await (const command of commandStream) {
      this.state = deployStateReducer(this.state, command);
    }
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

  public startExecutionPhase() {
    return this._runDeploymentCommand("Starting Execution", {
      type: "EXECUTION::START",
    });
  }

  public updateExecutionWithNewBatch(batch: number[]) {
    return this._runDeploymentCommand("Update execution with new batch", {
      type: "EXECUTION::SET_BATCH",
      batch,
    });
  }

  public async updateVertexResult(vertexId: number, result: VertexVisitResult) {
    return this._runDeploymentCommand(
      [`Update current with batch result for ${vertexId}`, [result]],
      {
        type: "EXECUTION::SET_VERTEX_RESULT",
        vertexId,
        result,
      }
    );
  }

  public readExecutionErrors() {
    const errors = [...Object.entries(this.state.execution.vertexes)]
      .filter(([_id, value]) => value.status === "FAILED")
      .reduce(
        (
          acc: { [key: number]: VertexVisitResultFailure },
          [id, { result }]
        ) => {
          if (
            result === undefined ||
            result === null ||
            result._kind === "success"
          ) {
            return acc;
          }

          acc[parseInt(id, 10)] = result;

          return acc;
        },
        {}
      );

    return errors;
  }

  public hasUnstarted(): boolean {
    return Object.values(this.state.execution.vertexes).some(
      (v) => v.status === "UNSTARTED"
    );
  }

  public hasErrors(): boolean {
    return Object.values(this.state.execution.vertexes).some(
      (v) => v.status === "FAILED"
    );
  }

  public hasHolds(): boolean {
    return Object.values(this.state.execution.vertexes).some(
      (v) => v.status === "HOLD"
    );
  }

  private async _runDeploymentCommand(
    logMessage: string | [string, any[]],
    command: DeployStateCommand
  ): Promise<void> {
    log.apply(this, typeof logMessage === "string" ? [logMessage] : logMessage);

    if (isDeployStateExecutionCommand(command)) {
      await this.commandJournal.record(command);
    }

    this.state = deployStateReducer(this.state, command);

    this._renderToUi(this.state);
  }

  private _renderToUi(state: DeployState) {
    if (this.ui === undefined) {
      return;
    }

    this.ui(state);
  }
}
