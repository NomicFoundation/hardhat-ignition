import { Box, Newline, Text } from "ink";
import Spinner from "ink-spinner";
import React from "react";

import {
  DeploymentError,
  DeploymentState,
  UiBatch,
  UiVertex,
  VertexStatus,
} from "../types";

export const IgnitionUi = ({
  deploymentState,
}: {
  deploymentState: DeploymentState;
}) => {
  if (deploymentState.phase === "uninitialized") {
    return null;
  }

  return (
    <Box flexDirection="column">
      <SummarySection deploymentState={deploymentState} />
      <BatchExecution deploymentState={deploymentState} />
      <FinalStatus deploymentState={deploymentState} />
    </Box>
  );
};

const SummarySection = ({
  deploymentState: { recipeName },
}: {
  deploymentState: DeploymentState;
}) => {
  return (
    <Box margin={1}>
      <Text bold={true}>
        Deploying recipe <Text italic={true}>{recipeName}</Text>
      </Text>
    </Box>
  );
};

const BatchExecution = ({
  deploymentState,
}: {
  deploymentState: DeploymentState;
}) => {
  return (
    <>
      <Divider />
      <Box paddingBottom={1}>
        {deploymentState.phase === "execution" ? (
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

      {deploymentState.batches.map((batch, i) => (
        <Batch key={`batch-${i}`} batch={batch}></Batch>
      ))}
    </>
  );
};

const FinalStatus = ({
  deploymentState,
}: {
  deploymentState: DeploymentState;
}) => {
  if (deploymentState.phase === "complete") {
    return (
      <Box>
        <Text>
          🚀 Deployment Complete for recipe{" "}
          <Text italic={true}>{deploymentState.recipeName}</Text>
        </Text>
      </Box>
    );
  }

  if (deploymentState.phase === "failed") {
    const deploymentErrors = deploymentState.getDeploymentErrors();

    return (
      <Box flexDirection="column">
        <Divider />

        <Box paddingTop={1}>
          <Text>
            ⛔ <Text italic={true}>{deploymentState.recipeName}</Text>{" "}
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

function toDisplayMessage(vertexEntry: VertexStatus): {
  color: "green" | "gray";
  message: string;
} {
  if (vertexEntry.status === "unstarted") {
    return {
      color: "gray",
      message: resolveUnstartedMessage(vertexEntry),
    };
  }

  if (vertexEntry.status === "success") {
    return { color: "green", message: resolveCompletedMessage(vertexEntry) };
  }

  throw new Error(`Unexpected vertex status: ${vertexEntry}`);
}

function resolveUnstartedMessage(vertexEntry: VertexStatus) {
  switch (vertexEntry.vertex.type) {
    case "ContractCall":
      return `Waiting to call contract ${vertexEntry.vertex.label}`;
    case "ContractDeploy":
      return `Waiting to deploy contract ${vertexEntry.vertex.label}`;
    case "DeployedContract":
      return `Waiting to resolve contract ${vertexEntry.vertex.label}`;
    case "LibraryDeploy":
      return `Waiting to deploy library ${vertexEntry.vertex.label}`;
    default:
      return assertNeverMessage(vertexEntry.vertex);
  }
}

function resolveCompletedMessage(vertexEntry: VertexStatus) {
  switch (vertexEntry.vertex.type) {
    case "ContractCall":
      return `Executed call to contract ${vertexEntry.vertex.label}`;
    case "ContractDeploy":
      return `Deployed contract ${vertexEntry.vertex.label}`;
    case "DeployedContract":
      return `Contract resolved ${vertexEntry.vertex.label}`;
    case "LibraryDeploy":
      return `Deployed contract ${vertexEntry.vertex.label}`;
    default:
      return assertNeverMessage(vertexEntry.vertex);
  }
}

function assertNeverMessage(vertexEntry: never): string {
  const entry: any = vertexEntry;
  const text = "type" in entry ? entry.type : entry;

  throw new Error(`Unexpected vertex type: ${text}`);
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
