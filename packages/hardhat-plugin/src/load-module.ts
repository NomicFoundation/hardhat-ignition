import type { Module, ModuleDict } from "@ignored/ignition-core";

import setupDebug from "debug";
import fsExtra from "fs-extra";
import path from "path";

import { IgnitionPluginError } from "./errors";

const debug = setupDebug("hardhat-ignition:modules");

export function loadModule(
  modulesDirectory: string,
  moduleNameOrPath: string
): Module<ModuleDict> | undefined {
  debug(`Loading user modules from '${modulesDirectory}'`);

  if (!fsExtra.existsSync(modulesDirectory)) {
    throw new IgnitionPluginError(`Directory ${modulesDirectory} not found.`);
  }

  const fullpathToModule = resolveFullPathToModule(
    modulesDirectory,
    moduleNameOrPath
  );

  if (fullpathToModule === undefined) {
    throw new IgnitionPluginError(`Could not find module ${moduleNameOrPath}`);
  }

  if (!isInModuleDirectory(modulesDirectory, fullpathToModule)) {
    throw new IgnitionPluginError(
      `The referenced module ${moduleNameOrPath} is outside the module directory ${modulesDirectory}`
    );
  }

  debug(`Loading module file '${fullpathToModule}'`);

  const module = require(fullpathToModule);

  return module.default ?? module;
}

function resolveFullPathToModule(
  modulesDirectory: string,
  moduleNameOrPath: string
): string | undefined {
  const pathToModule = path.resolve(moduleNameOrPath);
  if (fsExtra.pathExistsSync(pathToModule)) {
    return pathToModule;
  }

  const relativeToModules = path.resolve(modulesDirectory, moduleNameOrPath);
  if (fsExtra.pathExistsSync(relativeToModules)) {
    return relativeToModules;
  }

  const relativeToModulesWithJsExtension = path.resolve(
    modulesDirectory,
    `${moduleNameOrPath}.js`
  );
  if (fsExtra.pathExistsSync(relativeToModulesWithJsExtension)) {
    return relativeToModulesWithJsExtension;
  }

  const relativeToModulesWithTsExtension = path.resolve(
    modulesDirectory,
    `${moduleNameOrPath}.ts`
  );
  if (fsExtra.pathExistsSync(relativeToModulesWithTsExtension)) {
    return relativeToModulesWithTsExtension;
  }

  return undefined;
}

function isInModuleDirectory(modulesDirectory: string, modulePath: string) {
  const resolvedModulesDirectory = path.resolve(modulesDirectory);
  const moduleRelativeToModuleDir = path.relative(
    resolvedModulesDirectory,
    modulePath
  );

  return (
    !moduleRelativeToModuleDir.startsWith("..") &&
    !path.isAbsolute(moduleRelativeToModuleDir)
  );
}
