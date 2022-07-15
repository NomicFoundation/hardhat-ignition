import type { ConfigProvider } from "@nomicfoundation/ignition-core";
import { ParamValue } from "@nomicfoundation/ignition-core/dist/src/modules/types";
import { HasParamResult } from "@nomicfoundation/ignition-core/dist/src/providers";

export class ConfigWrapper implements ConfigProvider {
  private parameters: { [key: string]: ParamValue } | undefined;

  constructor() {
    this.parameters = undefined;
  }

  public async setParams(
    parameters:
      | {
          [key: string]: ParamValue;
        }
      | undefined
  ): Promise<void> {
    this.parameters = parameters;
  }

  public async getParam(paramName: string): Promise<ParamValue> {
    if (this.parameters === undefined) {
      throw new Error(
        `No parameters object provided to deploy options, but module requires parameter "${paramName}"`
      );
    }

    return this.parameters[paramName];
  }

  public async hasParam(paramName: string): Promise<HasParamResult> {
    if (this.parameters === undefined) {
      return {
        found: false,
        errorCode: "no-params",
      };
    }

    const paramFound = paramName in this.parameters;

    return paramFound
      ? { found: true }
      : {
          found: false,
          errorCode: "param-missing",
        };
  }
}
