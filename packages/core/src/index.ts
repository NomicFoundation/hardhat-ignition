/* eslint-disable import/no-unused-modules */
export * from "./errors";
export { buildModule } from "./new-api/build-module";
export { deploy } from "./new-api/deploy";
export { wipe } from "./new-api/wipe";
/* TODO: how is module constructor getting exposed? */
export { call } from "./new-api/internal/execution/call-result-decoding/call";
export {
  ExecutionError,
  ExecutionErrorTypes,
  decodeError,
  decodeResult,
  isReturnedInvalidDataExecutionError,
} from "./new-api/internal/execution/call-result-decoding/result-decoding";

export { ModuleConstructor } from "./new-api/internal/module-builder";
export { StoredDeploymentSerializer } from "./new-api/stored-deployment-serializer";
export * from "./new-api/type-guards";
export * from "./new-api/types/artifact";
export * from "./new-api/types/deployer";
export * from "./new-api/types/module";
export * from "./new-api/types/module-builder";
export * from "./new-api/types/provider";
export * from "./new-api/types/serialized-deployment";
