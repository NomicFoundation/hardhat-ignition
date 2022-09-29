import { ExecutionVertex, ExecutionVertexType } from "types/executionGraph";
import { VertexVisitResultFailure } from "types/graph";

interface VertexSuccess {
  status: "success";
  vertex: ExecutionVertex;
}

interface VertexFailure {
  status: "failure";
  vertex: ExecutionVertex;
  error: unknown;
}

interface Unstarted {
  status: "unstarted";
  vertex: ExecutionVertex;
}

export type VertexStatus = Unstarted | VertexSuccess | VertexFailure;

export type UiVertexStatus = "RUNNING" | "COMPELETED" | "ERRORED" | "HELD";
export interface UiVertex {
  id: number;
  label: string;
  type: ExecutionVertexType;
  status: UiVertexStatus;
}

export interface UiBatch {
  batchCount: number;
  vertexes: UiVertex[];
}

export interface DeploymentError {
  id: number;
  vertex: string;
  message: string;
  failureType: string;
}

export class DeploymentState {
  public phase: "uninitialized" | "execution" | "complete" | "failed";
  public recipeName: string;

  private validationErrors: string[];
  private executionVertexes: { [key: string]: VertexStatus };
  private order: number[];
  public batches: UiBatch[];
  private errors: { [key: number]: VertexVisitResultFailure } | undefined;

  constructor({ recipeName }: { recipeName: string }) {
    this.recipeName = recipeName;
    this.phase = "uninitialized";

    this.order = [];

    this.validationErrors = [];
    this.executionVertexes = {};
    this.batches = [];
  }

  public startExecutionPhase() {
    this.phase = "execution";
  }

  public endExecutionPhase(
    endPhase: "complete" | "failed",
    errors?: {
      [key: number]: VertexVisitResultFailure;
    }
  ) {
    this.phase = endPhase;
    this.errors = errors;
  }

  public setBatch(batchCount: number, batch: UiBatch) {
    this.batches[batchCount] = batch;
  }

  public setExecutionVertexes(vertexes: ExecutionVertex[]) {
    this.order = vertexes.map((v) => v.id);

    this.executionVertexes = Object.fromEntries(
      vertexes.map((v): [number, Unstarted] => [
        v.id,
        { status: "unstarted", vertex: v },
      ])
    );
  }

  public setExeuctionVertexAsSuccess(vertex: ExecutionVertex) {
    this.executionVertexes[vertex.id] = {
      vertex,
      status: "success",
    };
  }

  public setExecutionVertexAsFailure(vertex: ExecutionVertex, err: unknown) {
    this.executionVertexes[vertex.id] = {
      vertex,
      status: "failure",
      error: err,
    };
  }

  public toStatus(): VertexStatus[] {
    return this.order.map((id) => this.executionVertexes[id]);
  }

  public executedCount(): { executed: number; total: number } {
    const total = this.order.length;
    const executed = Object.values(this.executionVertexes).filter(
      (v) => v.status !== "unstarted"
    ).length;

    return { executed, total };
  }

  public getDeploymentErrors(): DeploymentError[] {
    if (this.batches.length === 0) {
      return [];
    }

    const lastBatch = this.batches[this.batches.length - 1];
    const errors = this.errors ?? {};

    return Object.keys(errors)
      .map((ids: string) => {
        const id = parseInt(ids);

        const error = errors[id];
        const vertex = lastBatch.vertexes.find((v) => v.id === id);

        if (vertex === undefined) {
          return undefined;
        }

        const errorDescription = this._buildErrorDescriptionFrom(
          error.failure,
          vertex
        );

        return errorDescription;
      })
      .filter((x): x is DeploymentError => x !== undefined);
  }

  private _buildErrorDescriptionFrom(
    error: Error,
    vertex: UiVertex
  ): DeploymentError {
    const message = "reason" in error ? (error as any).reason : error.message;

    return {
      id: vertex.id,
      vertex: vertex.label,
      message,
      failureType: this._resolveFailureTypeFrom(vertex),
    };
  }

  private _resolveFailureTypeFrom(vertex: UiVertex): string {
    switch (vertex.type) {
      case "ContractCall":
        return "Failed contract call";
      case "ContractDeploy":
        return "Failed contract deploy";
      case "DeployedContract":
        return "-";
      case "LibraryDeploy":
        return "Failed library deploy";
      default:
        return assertNeverUiVertexType(vertex.type);
    }
  }
}

function assertNeverUiVertexType(type: never): string {
  throw new Error(`Unexpected ui vertex type ${type}`);
}
