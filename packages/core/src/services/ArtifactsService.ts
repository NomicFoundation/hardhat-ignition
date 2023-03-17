import type { Artifact } from "../types/hardhat";
import type { Providers } from "../types/providers";

import { IArtifactsService } from "./services";

export class ArtifactsService implements IArtifactsService {
  constructor(private readonly _providers: Providers) {}

  public getArtifact(name: string): Promise<Artifact> {
    return this._providers.artifacts.getArtifact(name);
  }

  public hasArtifact(name: string): Promise<boolean> {
    return this._providers.artifacts.hasArtifact(name);
  }
}
