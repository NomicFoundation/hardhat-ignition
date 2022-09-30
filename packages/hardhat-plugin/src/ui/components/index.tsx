import { DeployState, ExecutionVertex } from "@nomicfoundation/ignition-core";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import React from "react";

import { DeploymentError, UiBatch, UiVertex, UiVertexStatus } from "../types";

export const IgnitionUi = ({ deployState }: { deployState: DeployState }) => {
  if (
    deployState.phase === "uninitialized" ||
    deployState.phase === "validating"
  ) {
    return (
      <Box>
        <Text>
          Ignition starting <Spinner type="simpleDots" />
        </Text>
      </Box>
    );
  }

  if (deployState.phase === "validation-failed") {
    return (
      <Box flexDirection="column">
        <Text>
          Ignition validation <Text color="red">failed</Text> for recipe{" "}
          {deployState.details.recipeName}
        </Text>

        <Box flexDirection="column" marginTop={1}>
          {deployState.validation.errors.map((err, i) => (
            <ErrorBox key={`err-${i}`} error={err} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SummarySection deployState={deployState} />
      <BatchExecution deployState={deployState} />
      <FinalStatus deployState={deployState} />
    </Box>
  );
};

const ErrorBox = ({ error }: { error: Error }) => {
  return <Text>{error.message}</Text>;
};

const SummarySection = ({
  deployState: {
    details: { recipeName },
  },
}: {
  deployState: DeployState;
}) => {
  return (
    <Box margin={1}>
      <Text bold={true}>
        Deploying recipe <Text italic={true}>{recipeName}</Text>
      </Text>
    </Box>
  );
};

const BatchExecution = ({ deployState }: { deployState: DeployState }) => {
  const batches = resolveBatchesFrom(deployState);

  return (
    <>
      <Divider />
      <Box paddingBottom={1}>
        {deployState.phase === "execution" ? (
          <>
            <Text bold>
              Executing <Spinner type="simpleDots" />
            </Text>
          </>
        ) : (
          <>
            <Text bold>Executed</Text>
          </>
        )}
      </Box>

      {batches.map((batch, i) => (
        <Batch key={`batch-${i}`} batch={batch}></Batch>
      ))}
    </>
  );
};

const resolveBatchesFrom = (deployState: DeployState): UiBatch[] => {
  const stateBatches =
    deployState.execution.batch.size > 0
      ? [
          ...deployState.execution.previousBatches,
          deployState.execution.batch.keys(),
        ]
      : deployState.execution.previousBatches;

  return stateBatches.map((sb, i) => ({
    batchCount: i,
    vertexes: [...sb]
      .sort()
      .map((vertexId): UiVertex | null => {
        const vertex =
          deployState.transform.executionGraph?.vertexes.get(vertexId);

        if (vertex === undefined) {
          return null;
        }

        const uiVertex: UiVertex = {
          id: vertex.id,
          label: vertex.label,
          type: vertex.type,
          status: determineStatusOf(deployState, vertex.id),
        };

        return uiVertex;
      })
      .filter((v): v is UiVertex => v !== null),
  }));
};

const determineStatusOf = (
  deployState: DeployState,
  vertexId: number
): UiVertexStatus => {
  const execution = deployState.execution;

  if (execution.batch.has(vertexId)) {
    const entry = execution.batch.get(vertexId);

    if (entry === null) {
      return "RUNNING";
    }

    if (entry?._kind === "success") {
      return "COMPELETED";
    }

    if (entry?._kind === "failure") {
      return "ERRORED";
    }

    throw new Error(`Unable to determine current batch status ${entry}`);
  }

  if (execution.errored.has(vertexId)) {
    return "ERRORED";
  }

  if (execution.completed.has(vertexId)) {
    return "COMPELETED";
  }

  throw new Error(`Unable to determine vertex status for ${vertexId}`);
};

const FinalStatus = ({ deployState }: { deployState: DeployState }) => {
  if (deployState.phase === "complete") {
    return (
      <Box flexDirection="column">
        <Divider />
        <Text>
          🚀 Deployment Complete for recipe{" "}
          <Text italic={true}>{deployState.details.recipeName}</Text>
        </Text>
      </Box>
    );
  }

  if (deployState.phase === "failed") {
    const deploymentErrors: DeploymentError[] =
      getDeploymentErrors(deployState);

    return (
      <Box flexDirection="column">
        <Divider />

        <Box>
          <Text>
            ⛔ <Text italic={true}>{deployState.details.recipeName}</Text>{" "}
            deployment{" "}
            <Text bold color="red">
              failed
            </Text>
          </Text>
        </Box>

        <Box flexDirection="column">
          {deploymentErrors.map((de) => (
            <DepError key={`error-${de.id}`} deploymentError={de} />
          ))}
        </Box>
      </Box>
    );
  }

  return null;
};

const getDeploymentErrors = (deployState: DeployState): DeploymentError[] => {
  return [...deployState.execution.errored]
    .map((id) => {
      const vertexResult = deployState.execution.resultsAccumulator.get(id);

      if (vertexResult === undefined || vertexResult._kind === "success") {
        return null;
      }

      const failure = vertexResult.failure;

      const vertex = deployState.transform.executionGraph?.vertexes.get(id);

      if (vertex === undefined) {
        return null;
      }

      const errorDescription = buildErrorDescriptionFrom(failure, vertex);

      return errorDescription;
    })
    .filter((x): x is DeploymentError => x !== null);
};

const buildErrorDescriptionFrom = (
  error: Error,
  vertex: ExecutionVertex
): DeploymentError => {
  const message = "reason" in error ? (error as any).reason : error.message;

  return {
    id: vertex.id,
    vertex: vertex.label,
    message,
    failureType: resolveFailureTypeFrom(vertex),
  };
};

const resolveFailureTypeFrom = (vertex: ExecutionVertex): string => {
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
      return assertNeverUiVertexType(vertex);
  }
};

function assertNeverUiVertexType(vertex: never): string {
  throw new Error(`Unexpected ui vertex type ${vertex}`);
}

const DepError = ({
  deploymentError,
}: {
  deploymentError: DeploymentError;
}) => {
  return (
    <Box flexDirection="column" margin={1}>
      <Text bold={true}>
        {deploymentError.failureType} - {deploymentError.vertex}
      </Text>
      <Text>{deploymentError.message}</Text>
    </Box>
  );
};

const Batch = ({ batch }: { batch: UiBatch }) => {
  const borderColor = resolveBatchBorderColor(batch.vertexes);

  return (
    <Box borderStyle="single" flexDirection="column" borderColor={borderColor}>
      <Box flexDirection="row-reverse">
        <Text>#{batch.batchCount}</Text>
      </Box>

      {batch.vertexes.map((vertex, i) => (
        <Vertex
          key={`batch-${batch.batchCount}-vertex-${i}`}
          vertex={vertex}
        ></Vertex>
      ))}
    </Box>
  );
};

const Vertex = ({ vertex }: { vertex: UiVertex }) => {
  const { borderColor, borderStyle, textColor } = resolveVertexColors(vertex);

  return (
    <Box borderStyle={borderStyle} borderColor={borderColor}>
      <StatusBadge vertex={vertex} />
      <Text color={textColor}>{vertex.label}</Text>
    </Box>
  );
};

const StatusBadge = ({ vertex }: { vertex: UiVertex }) => {
  let badge: any = " ";
  switch (vertex.status) {
    case "COMPELETED":
      badge = <Text>✅</Text>;
      break;
    case "ERRORED":
      badge = <Text>❌</Text>;
      break;
    case "HELD":
      badge = <Text>⚠</Text>;
      break;
    case "RUNNING":
      badge = <Spinner />;
      break;
    default:
      return assertNeverVertexStatus(vertex.status);
  }

  return (
    <>
      <Text> </Text>
      {badge}
      <Text> </Text>
    </>
  );
};

function resolveBatchBorderColor(vertexes: UiVertex[]) {
  if (vertexes.some((v) => v.status === "RUNNING")) {
    return "lightgray";
  }

  if (vertexes.some((v) => v.status === "ERRORED")) {
    return "red";
  }

  if (vertexes.every((v) => v.status === "COMPELETED")) {
    return "green";
  }

  return "lightgray";
}

function resolveVertexColors(vertex: UiVertex): {
  borderColor: string;
  borderStyle: "single" | "classic" | "bold" | "singleDouble";
  textColor: string;
} {
  switch (vertex.status) {
    case "COMPELETED":
      return {
        borderColor: "greenBright",
        borderStyle: "single",
        textColor: "white",
      };
    case "RUNNING":
      return {
        borderColor: "lightgray",
        borderStyle: "singleDouble",
        textColor: "white",
      };
    case "HELD":
      return {
        borderColor: "darkgray",
        borderStyle: "bold",
        textColor: "white",
      };
    case "ERRORED":
      return {
        borderColor: "redBright",
        borderStyle: "bold",
        textColor: "white",
      };
    default:
      return assertNeverVertexStatus(vertex.status);
  }
}

function assertNeverVertexStatus(status: never): any {
  throw new Error(`Unexpected vertex status ${status}`);
}

const Divider = () => {
  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Box width="100%">
        <Text wrap="truncate">
          {Array.from({ length: 400 })
            .map((_i) => "─")
            .join("")}
        </Text>
      </Box>
    </Box>
  );
};
