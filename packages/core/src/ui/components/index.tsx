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
        <Text bold={true}>Executing recipe {recipeName}</Text>

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
  return (
    <Box borderStyle="single" flexDirection="column">
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
  let color = "lightgray";
  switch (vertex.status) {
    case "COMPELETED":
      color = "green";
      break;
    case "RUNNING":
      color = "lightgray";
      break;
    case "HELD":
      color = "darkgray";
      break;
    case "ERRORED":
      color = "red";
      break;
    default:
      assertNeverVertexStatus(vertex.status);
  }

  return (
    <Box borderStyle="single" borderColor={color}>
      <Text color={color}>{vertex.label}</Text>
    </Box>
  );
};

function assertNeverVertexStatus(status: never) {
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
