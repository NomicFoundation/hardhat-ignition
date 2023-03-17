import type { ExternalParamValue } from "../types/deploymentGraph";
import type { HasParamResult, Providers } from "../types/providers";

import { IConfigService } from "./services";

export class ConfigService implements IConfigService {
  constructor(private readonly _providers: Providers) {}

  public getParam(paramName: string): Promise<ExternalParamValue> {
    return this._providers.config.getParam(paramName);
  }

  public hasParam(paramName: string): Promise<HasParamResult> {
    return this._providers.config.hasParam(paramName);
  }
}
