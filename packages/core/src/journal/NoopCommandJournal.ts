import { DeployStateExecutionCommand } from "deployment/deployStateReducer";

import { ICommandJournal } from "../types/journal";

export class NoopCommandJournal implements ICommandJournal {
  public async record(_command: DeployStateExecutionCommand): Promise<void> {
    return;
  }
}
