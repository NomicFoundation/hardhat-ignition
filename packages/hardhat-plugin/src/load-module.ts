import { Module, ModuleDict } from "@ignored/ignition-core";
import setupDebug from "debug";
import fsExtra from "fs-extra";
import path from "path";

const debug = setupDebug("hardhat-ignition:modules");

export function loadModule(
  modulesDirectory: string,
  moduleNameOrPath: string
): Module<ModuleDict> | undefined {
  debug(`Loading user modules from '${modulesDirectory}'`);

  if (!fsExtra.existsSync(modulesDirectory)) {
    throw new Error(`Directory ${modulesDirectory} not found.`);
  }

  const resolvedModulePath = path.resolve(modulesDirectory, moduleNameOrPath);

  return getUserModulesFromPaths(resolvedModulePath);
}

function getUserModulesFromPaths(fullModulePath: string): Module<ModuleDict> {
  debug(`Loading '${fullModulePath}' module file`);

  const fileExists = fsExtra.pathExistsSync(fullModulePath);

  if (!fileExists) {
    throw new Error(`Module ${fullModulePath} doesn't exist`);
  }

  debug(`Loading module file '${fullModulePath}'`);

  const userModule = require(fullModulePath);

  return userModule;
}
