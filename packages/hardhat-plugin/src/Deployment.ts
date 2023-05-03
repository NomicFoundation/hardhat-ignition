/**
 * The different phases a deployment will move through:
 *
 * uninitialized -\> validating -\> execution -\> complete
 *                      |             |--------\> hold
 *                      |             |--------\> failed
 *                      |
 *                      |----------------------\> validation-failed
 *                      |----------------------\> reconciliation-failed
 *
 * @internal
 */
export type DeployPhase =
  | "uninitialized"
  | "validating"
  | "execution"
  | "complete"
  | "failed"
  | "hold"
  | "validation-failed"
  | "reconciliation-failed"
  | "failed-unexpectedly";

export interface DeployNetworkConfig {
  moduleName: string;
  chainId: number;
  networkName: string;
  accounts: string[];
  artifacts: Artifact[];
  force: boolean;
}

export type DeployStateCommand =
  | { type: "SET_DETAILS"; config: Partial<DeployNetworkConfig> }
  | { type: "SET_CHAIN_ID"; chainId: number }
  | { type: "SET_NETWORK_NAME"; networkName: string }
  | { type: "SET_ACCOUNTS"; accounts: string[] }
  | { type: "SET_FORCE_FLAG"; force: boolean }
  | {
      type: "START_VALIDATION";
    }
  | {
      type: "VALIDATION_FAIL";
      errors: Error[];
    }
  | {
      type: "TRANSFORM_COMPLETE";
      executionGraph: IGraph<ExecutionVertex>;
    }
  | {
      type: "RECONCILIATION_FAILED";
    }
  | {
      type: "UNEXPECTED_FAIL";
      errors: Error[];
    };

export interface DeployState {
  phase: DeployPhase;
  details: DeployNetworkConfig;
  validation: ValidationState;
  transform: {
    executionGraph: IGraph<ExecutionVertex> | null;
  };
  execution: ExecutionState;
  unexpected: {
    errors: Error[];
  };
}

export function initializeDeployState(moduleName: string): DeployState {
  return {
    phase: "uninitialized",
    details: {
      moduleName,
      chainId: 0,
      networkName: "",
      accounts: [],
      artifacts: [],
      force: false,
    },
    validation: {
      errors: [],
    },
    transform: {
      executionGraph: null,
    },
    execution: {
      run: 0,
      vertexes: {},
      batch: null,
      previousBatches: [],
      executionGraphHash: "",
    },
    unexpected: {
      errors: [],
    },
  };
}

export function deployStateReducer(
  state: DeployState,
  action: DeployStateCommand
): DeployState {
  switch (action.type) {
    case "SET_DETAILS":
      return {
        ...state,
        details: {
          ...state.details,
          ...action.config,
        },
      };
    case "SET_CHAIN_ID":
      return {
        ...state,
        details: {
          ...state.details,
          chainId: action.chainId,
        },
      };
    case "SET_NETWORK_NAME":
      return {
        ...state,
        details: {
          ...state.details,
          networkName: action.networkName,
        },
      };
    case "SET_ACCOUNTS":
      return {
        ...state,
        details: {
          ...state.details,
          accounts: action.accounts,
        },
      };
    case "SET_FORCE_FLAG":
      return {
        ...state,
        details: {
          ...state.details,
          force: action.force,
        },
      };
    case "START_VALIDATION":
      return {
        ...state,
        phase: "validating",
      };
    case "VALIDATION_FAIL":
      return {
        ...state,
        phase: "validation-failed",
        validation: {
          ...state.validation,
          errors: action.errors,
        },
      };
    case "TRANSFORM_COMPLETE":
      return {
        ...state,
        transform: { executionGraph: action.executionGraph },
      };
    case "RECONCILIATION_FAILED":
      return { ...state, phase: "reconciliation-failed" };
    case "UNEXPECTED_FAIL":
      return {
        ...state,
        phase: "failed-unexpectedly",
        unexpected: {
          errors: action.errors,
        },
      };
  }
}

export class Deployment {
  public state: DeployState;
  public ui?: UpdateUiAction;
  private commandJournal: ICommandJournal;

  constructor(
    moduleName: string,
    journal: ICommandJournal,
    ui?: UpdateUiAction
  ) {
    this.state = initializeDeployState(moduleName);
    this.commandJournal = journal;
    this.ui = ui;
  }

  public async load(
    commandStream:
      | AsyncGenerator<DeployStateExecutionCommand, void, unknown>
      | DeployStateExecutionCommand[]
  ) {
    log("Loading from journal");

    for await (const command of commandStream) {
      this.state = deployStateReducer(this.state, command);
    }
  }

  public setDeploymentDetails(config: Partial<DeployNetworkConfig>) {
    return this._runDeploymentCommand(
      `DeploymentDetails resolved as ${JSON.stringify(config)}`,
      { type: "SET_DETAILS", config }
    );
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

  public setAccounts(accounts: string[]) {
    return this._runDeploymentCommand(
      `Accounts resolved as '${accounts.join(", ")}'`,
      {
        type: "SET_ACCOUNTS",
        accounts,
      }
    );
  }

  public setForceFlag(force: boolean) {
    return this._runDeploymentCommand(
      `Force resolved as '${force.toString()}'`,
      {
        type: "SET_FORCE_FLAG",
        force,
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

  public failUnexpected(errors: Error[]) {
    return this._runDeploymentCommand(
      [`Failure from unexpected errors`, errors],
      {
        type: "UNEXPECTED_FAIL",
        errors,
      }
    );
  }

  public failReconciliation() {
    return this._runDeploymentCommand(`Reconciliation failed`, {
      type: "RECONCILIATION_FAILED",
    });
  }

  public startExecutionPhase(executionGraphHash: string) {
    return this._runDeploymentCommand("Starting Execution", {
      type: "EXECUTION::START",
      executionGraphHash,
    });
  }

  public updateExecutionWithNewBatch(batch: number[]) {
    return this._runDeploymentCommand("Update execution with new batch", {
      type: "EXECUTION::SET_BATCH",
      batch,
    });
  }

  public async updateVertexResult(
    vertexId: number,
    result: ExecutionVertexVisitResult
  ) {
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
    return [...Object.entries(this.state.execution.vertexes)]
      .filter(([_id, value]) => value.status === "FAILED")
      .reduce(
        (
          acc: { [key: number]: VertexVisitResultFailure },
          [id, { result }]
        ) => {
          if (
            result === undefined ||
            result === null ||
            result._kind !== VertexResultEnum.FAILURE
          ) {
            return acc;
          }

          acc[parseInt(id, 10)] = result;

          return acc;
        },
        {}
      );
  }

  public readExecutionHolds(): VertexDescriptor[] {
    const executionGraph = this.state.transform.executionGraph;

    if (executionGraph === null) {
      throw new IgnitionError("Cannot read from unset execution graph");
    }

    return [...Object.entries(this.state.execution.vertexes)]
      .filter(([_id, value]) => value.status === "HOLD")
      .map(([id]) => {
        const vertex = executionGraph.vertexes.get(parseInt(id, 10));

        if (vertex === undefined) {
          return null;
        }

        const descriptor: VertexDescriptor = {
          id: vertex.id,
          label: vertex.label,
          type: vertex.type,
        };

        return descriptor;
      })
      .filter((x): x is VertexDescriptor => x !== null);
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
