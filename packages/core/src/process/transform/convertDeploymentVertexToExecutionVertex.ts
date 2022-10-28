import { Services } from "services/types";
import {
  ArtifactContractDeploymentVertex,
  ArtifactLibraryDeploymentVertex,
  CallDeploymentVertex,
  DeployedContractDeploymentVertex,
  HardhatContractDeploymentVertex,
  HardhatLibraryDeploymentVertex,
  IDeploymentGraph,
  DeploymentGraphVertex,
} from "types/deploymentGraph";
import {
  ContractCall,
  ContractDeploy,
  DeployedContract,
  ExecutionVertex,
  LibraryDeploy,
} from "types/executionGraph";
import { DeploymentGraphFuture } from "types/future";
import { Artifact } from "types/hardhat";
import { isFuture } from "utils/guards";

interface TransformContext {
  services: Services;
  graph: IDeploymentGraph;
}

export function convertDeploymentVertexToExecutionVertex(
  context: TransformContext
): (deploymentVertex: DeploymentGraphVertex) => Promise<ExecutionVertex> {
  return (
    deploymentVertex: DeploymentGraphVertex
  ): Promise<ExecutionVertex> => {
    switch (deploymentVertex.type) {
      case "HardhatContract":
        return convertHardhatContractToContractDeploy(
          deploymentVertex,
          context
        );
      case "ArtifactContract":
        return convertArtifactContractToContractDeploy(
          deploymentVertex,
          context
        );
      case "DeployedContract":
        return convertDeployedContractToDeployedDeploy(
          deploymentVertex,
          context
        );
      case "Call":
        return convertCallToContractCall(deploymentVertex, context);
      case "HardhatLibrary":
        return convertHardhatLibraryToLibraryDeploy(deploymentVertex, context);
      case "ArtifactLibrary":
        return convertArtifactLibraryToLibraryDeploy(deploymentVertex, context);
      case "Virtual":
        throw new Error(
          `Virtual vertex should be removed ${deploymentVertex.id} (${deploymentVertex.label})`
        );
      default:
        return assertDeploymentVertexNotExpected(deploymentVertex);
    }
  };
}

async function convertHardhatContractToContractDeploy(
  vertex: HardhatContractDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractDeploy> {
  const artifact: Artifact =
    await transformContext.services.artifacts.getArtifact(vertex.contractName);

  return {
    type: "ContractDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact,
    args: await convertArgs(vertex.args, transformContext),
    libraries: vertex.libraries,
  };
}

async function convertArtifactContractToContractDeploy(
  vertex: ArtifactContractDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractDeploy> {
  return {
    type: "ContractDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: await convertArgs(vertex.args, transformContext),
    libraries: vertex.libraries,
  };
}

async function convertDeployedContractToDeployedDeploy(
  vertex: DeployedContractDeploymentVertex,
  _transformContext: TransformContext
): Promise<DeployedContract> {
  return {
    type: "DeployedContract",
    id: vertex.id,
    label: vertex.label,
    address: vertex.address,
    abi: vertex.abi,
  };
}

async function convertCallToContractCall(
  vertex: CallDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractCall> {
  return {
    type: "ContractCall",
    id: vertex.id,
    label: vertex.label,

    contract: await resolveParameter(vertex.contract, transformContext),
    method: vertex.method,
    args: await convertArgs(vertex.args, transformContext),
  };
}

async function convertHardhatLibraryToLibraryDeploy(
  vertex: HardhatLibraryDeploymentVertex,
  transformContext: TransformContext
): Promise<LibraryDeploy> {
  const artifact: Artifact =
    await transformContext.services.artifacts.getArtifact(vertex.libraryName);

  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact,
    args: await convertArgs(vertex.args, transformContext),
  };
}

async function convertArtifactLibraryToLibraryDeploy(
  vertex: ArtifactLibraryDeploymentVertex,
  transformContext: TransformContext
): Promise<LibraryDeploy> {
  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: await convertArgs(vertex.args, transformContext),
  };
}

function assertDeploymentVertexNotExpected(
  vertex: never
): Promise<ExecutionVertex> {
  const v: any = vertex;

  const obj = typeof v === "object" && "type" in v ? v.type : v;

  throw new Error(`Type not expected: ${obj}`);
}

async function convertArgs(
  args: Array<boolean | string | number | DeploymentGraphFuture>,
  transformContext: TransformContext
): Promise<Array<boolean | string | number | DeploymentGraphFuture>> {
  const resolvedArgs = [];

  for (const arg of args) {
    const resolvedArg = await resolveParameter(arg, transformContext);

    resolvedArgs.push(resolvedArg);
  }

  return resolvedArgs;
}

async function resolveParameter(
  arg: boolean | string | number | DeploymentGraphFuture,
  { services, graph }: TransformContext
) {
  if (!isFuture(arg)) {
    return arg;
  }

  if (arg.type !== "parameter") {
    return arg;
  }

  const scope = arg.scope;
  const scopeData = graph.scopeData[scope];

  if (
    scopeData !== undefined &&
    scopeData.parameters !== undefined &&
    arg.label in scopeData.parameters
  ) {
    return scopeData.parameters[arg.label];
  }

  const hasParamResult = await services.config.hasParam(arg.label);

  if (arg.subtype === "optional") {
    return hasParamResult.found
      ? services.config.getParam(arg.label)
      : arg.defaultValue;
  }

  if (hasParamResult.found === false) {
    switch (hasParamResult.errorCode) {
      case "no-params":
        throw new Error(
          `No parameters object provided to deploy options, but module requires parameter "${arg.label}"`
        );
      case "param-missing":
        throw new Error(`No parameter provided for "${arg.label}"`);
      default:
        assertNeverParamResult(hasParamResult.errorCode);
    }
  }

  return services.config.getParam(arg.label);
}

function assertNeverParamResult(hasParamResult: never) {
  throw new Error(`Unexpected error code ${hasParamResult}`);
}
