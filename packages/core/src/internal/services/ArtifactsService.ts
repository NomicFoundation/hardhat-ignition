import type { ArtifactOld } from "../../types/hardhat";
import type { Providers } from "../../types/providers";
import type { IArtifactsService } from "../types/services";

export class ArtifactsService implements IArtifactsService {
  constructor(private readonly _providers: Providers) {}

  public getArtifact(name: string): Promise<ArtifactOld> {
    return this._providers.artifacts.getArtifact(name);
  }

  public hasArtifact(name: string): Promise<boolean> {
    return this._providers.artifacts.hasArtifact(name);
  }

  public getAllArtifacts(): Promise<ArtifactOld[]> {
    return this._providers.artifacts.getAllArtifacts();
  }
}
