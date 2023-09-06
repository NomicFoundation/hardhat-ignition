import { IgnitionValidationError } from "../../errors";
import { ArtifactResolver } from "../../types/artifact";
import {
  DeploymentParameters,
  DeploymentResultType,
  ValidationErrorDeploymentResult,
} from "../../types/deploy";
import { Future, FutureType, IgnitionModule } from "../../types/module";
import { assertIgnitionInvariant } from "../utils/assertions";
import { getFuturesFromModule } from "../utils/get-futures-from-module";

import { validateArtifactContractAt } from "./stageTwo/validateArtifactContractAt";
import { validateArtifactContractDeployment } from "./stageTwo/validateArtifactContractDeployment";
import { validateArtifactLibraryDeployment } from "./stageTwo/validateArtifactLibraryDeployment";
import { validateNamedContractAt } from "./stageTwo/validateNamedContractAt";
import { validateNamedContractCall } from "./stageTwo/validateNamedContractCall";
import { validateNamedContractDeployment } from "./stageTwo/validateNamedContractDeployment";
import { validateNamedLibraryDeployment } from "./stageTwo/validateNamedLibraryDeployment";
import { validateNamedStaticCall } from "./stageTwo/validateNamedStaticCall";
import { validateReadEventArgument } from "./stageTwo/validateReadEventArgument";
import { validateSendData } from "./stageTwo/validateSendData";

export async function validateStageTwo(
  module: IgnitionModule,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<ValidationErrorDeploymentResult | null> {
  const futures = getFuturesFromModule(module);

  for (const future of futures) {
    try {
      await _validateFuture(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    } catch (err) {
      assertIgnitionInvariant(
        err instanceof IgnitionValidationError,
        `Expected an IgnitionValidationError when validating the future ${future.id}`
      );

      return {
        type: DeploymentResultType.VALIDATION_ERROR,
        errors: {
          [future.id]: [err.message],
        },
      };
    }
  }

  // No validation errors
  return null;
}

async function _validateFuture(
  future: Future,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  switch (future.type) {
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      await validateArtifactContractDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      await validateArtifactLibraryDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.ARTIFACT_CONTRACT_AT:
      await validateArtifactContractAt(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
      await validateNamedContractDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
      await validateNamedLibraryDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.NAMED_CONTRACT_AT:
      await validateNamedContractAt(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.NAMED_CONTRACT_CALL:
      await validateNamedContractCall(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.NAMED_STATIC_CALL:
      await validateNamedStaticCall(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.READ_EVENT_ARGUMENT:
      await validateReadEventArgument(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
    case FutureType.SEND_DATA:
      await validateSendData(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
      break;
  }
}
