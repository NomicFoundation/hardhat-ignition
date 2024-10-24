import { IgnitionError } from "../../errors";
import {
  isAccountRuntimeValue,
  isContractFuture,
  isFuture,
  isNamedStaticCallFuture,
  isReadEventArgumentFuture,
  isRuntimeValue,
} from "../../type-guards";
import { Artifact } from "../../types/artifact";
import { DeploymentParameters } from "../../types/deploy";
import {
  AccountRuntimeValue,
  ArgumentType,
  ReadEventArgumentFuture,
  RuntimeValue,
  StaticCallFuture,
} from "../../types/module";
import { ERRORS } from "../errors-list";
import { getEventFragment, getFunctionFragment } from "../execution/abi";

export function validateAccountRuntimeValue(
  arv: AccountRuntimeValue,
  accounts: string[]
): IgnitionError[] {
  const errors: IgnitionError[] = [];

  if (arv.accountIndex < 0) {
    errors.push(new IgnitionError(ERRORS.VALIDATION.NEGATIVE_ACCOUNT_INDEX));
  }

  if (arv.accountIndex >= accounts.length) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.ACCOUNT_INDEX_TOO_HIGH, {
        accountIndex: arv.accountIndex,
        accountsLength: accounts.length,
      })
    );
  }

  return errors;
}

export function filterToAccountRuntimeValues(
  runtimeValues: RuntimeValue[]
): AccountRuntimeValue[] {
  return runtimeValues
    .map((rv) => {
      if (isAccountRuntimeValue(rv)) {
        return rv;
      } else if (isAccountRuntimeValue(rv.defaultValue)) {
        return rv.defaultValue;
      } else {
        return undefined;
      }
    })
    .filter((rv): rv is AccountRuntimeValue => rv !== undefined);
}

export function retrieveNestedRuntimeValues(
  args: ArgumentType[]
): RuntimeValue[] {
  return args.flatMap(checkForValues).filter(isRuntimeValue);
}

function checkForValues(
  arg: ArgumentType
): Array<RuntimeValue | null> | RuntimeValue | null {
  if (isRuntimeValue(arg)) {
    return arg;
  }

  if (Array.isArray(arg)) {
    return arg.flatMap(checkForValues);
  }

  if (!isFuture(arg) && typeof arg === "object" && arg !== null) {
    return Object.values(arg).flatMap(checkForValues);
  }

  return null;
}

export function validateArgs(
  artifact: Artifact,
  args: ArgumentType[],
  deploymentParameters: DeploymentParameters,
  functionName?: string
): IgnitionError[] {
  // loop through, probably recursively, and resolve to primitive type strings
  const argTypes = args.map((arg) =>
    resolveTypeForArg(artifact, arg, deploymentParameters)
  );

  // get an array of primitive type strings representing the valid type for each arg, derived from the ABI and likely with help from ethers
  const validTypes = resolveValidABITypesForArgs(artifact, functionName);

  // compare each argument against the valid type
  const errors = [];
  for (let i = 0; i < argTypes.length; i++) {
    if (argTypes[i] !== validTypes[i]) {
      errors.push(new IgnitionError("invalid arg type"));
    }
  }

  return errors;
}

function resolveTypeForArg(
  artifact: Artifact,
  arg: ArgumentType,
  deploymentParameters: DeploymentParameters
): string {
  if (isRuntimeValue(arg)) {
    if (isAccountRuntimeValue(arg)) {
      return "string";
    }

    return (
      typeof deploymentParameters[arg.moduleId]?.[arg.name] ?? arg.defaultValue
    );
  }

  if (isFuture(arg)) {
    if (isContractFuture(arg)) {
      return "string";
    }

    if (isNamedStaticCallFuture(arg)) {
      return resolveTypeForStaticCall(artifact, arg);
    }

    if (isReadEventArgumentFuture(arg)) {
      return resolveTypeForEvent(artifact, arg);
    }
  }

  // todo: handle arrays
  if (Array.isArray(arg)) {
    return "array";
  }

  // todo: handle objects
  if (typeof arg === "object") {
    return "object";
  }

  return typeof arg;
}

function resolveTypeForStaticCall(
  artifact: Artifact,
  future: StaticCallFuture<string, string>
): string {
  const { ethers } = require("ethers") as typeof import("ethers");

  const iface = new ethers.Interface(artifact.abi);
  const functionFragment = getFunctionFragment(iface, future.functionName);

  if (typeof future.nameOrIndex === "string") {
    for (const output of functionFragment.outputs) {
      if (output.name === future.nameOrIndex) {
        return resolveABITypeToPrimitive(output.baseType);
      }
    }

    throw new Error(`output name not found: ${future.nameOrIndex}`);
  } else {
    return resolveABITypeToPrimitive(
      functionFragment.outputs[future.nameOrIndex].baseType
    );
  }
}

function resolveTypeForEvent(
  artifact: Artifact,
  future: ReadEventArgumentFuture
): string {
  const { ethers } = require("ethers") as typeof import("ethers");

  const iface = new ethers.Interface(artifact.abi);
  const eventFragment = getEventFragment(iface, future.eventName);

  if (typeof future.nameOrIndex === "string") {
    for (const input of eventFragment.inputs) {
      if (input.name === future.nameOrIndex) {
        return resolveABITypeToPrimitive(input.baseType);
      }
    }

    throw new Error(`input name not found: ${future.nameOrIndex}`);
  } else {
    return resolveABITypeToPrimitive(
      eventFragment.inputs[future.nameOrIndex].baseType
    );
  }
}

function resolveValidABITypesForArgs(
  artifact: Artifact,
  functionName?: string
): string[] {
  const { ethers } = require("ethers") as typeof import("ethers");

  const iface = new ethers.Interface(artifact.abi);
  const fragment =
    functionName === undefined
      ? iface.deploy
      : getFunctionFragment(iface, functionName);

  return fragment.inputs.map((input) =>
    resolveABITypeToPrimitive(input.baseType)
  );
}

function resolveABITypeToPrimitive(abiType: string): string {
  if (abiType.startsWith("array")) {
    return "array";
  }

  if (abiType.startsWith("tuple")) {
    return "object";
  }

  if (abiType.startsWith("uint") || abiType.startsWith("int")) {
    return "bigint";
  }

  if (abiType.startsWith("fixed") || abiType.startsWith("ufixed")) {
    return "number";
  }

  if (abiType.startsWith("bool")) {
    return "boolean";
  }

  if (abiType.startsWith("bytes")) {
    return "string";
  }

  if (abiType.startsWith("address")) {
    return "string";
  }

  if (abiType.startsWith("string")) {
    return "string";
  }

  throw new Error(`unrecognized ABI type: ${abiType}`);
}
