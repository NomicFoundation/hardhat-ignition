import { Box, Text } from "ink";
import React from "react";

import { DeploymentState, UiBatch, UiVertex, VertexStatus } from "../types";

export const IgnitionUi = ({
  deploymentState,
}: {
  deploymentState: DeploymentState;
}) => {
  const recipeName = deploymentState.recipeName;

  const vertexEntries = deploymentState.toStatus();
  const { executed, total } = deploymentState.executedCount();

  if (deploymentState.phase === "uninitialized") {
    return null;
  }

  if (deploymentState.phase === "execution") {
    return (
      <Box flexDirection="column">
        <Box margin={1}>
          <Text bold={true}>
            Deploying recipe <Text italic={true}>{recipeName}</Text>
          </Text>
        </Box>

        {deploymentState.batches.map((batch, i) => (
          <Batch key={`batch-${i}`} batch={batch}></Batch>
        ))}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text> </Text>
      <Text bold={true}>
        Deploying ({executed} of {total} transactions executed){" "}
      </Text>
      <Text> </Text>

      {vertexEntries.map((entry) => (
        <VertexStatusRow key={entry.vertex.id} vertexEntry={entry} />
      ))}

      {executed === total ? (
        <>
          <Text> </Text>
          <Text bold={true} color={"green"}>
            Deployment complete
          </Text>
          <Text> </Text>
        </>
      ) : null}
    </Box>
  );
};

const VertexStatusRow = ({ vertexEntry }: { vertexEntry: VertexStatus }) => {
  const { color, message } = toDisplayMessage(vertexEntry);

  return (
    <Box key={vertexEntry.vertex.id}>
      <Text color={color}>{message}</Text>
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
      <Text color={textColor}>{vertex.label}</Text>
    </Box>
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
