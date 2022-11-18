import {
  DeployStateExecutionCommand,
  ICommandJournal,
} from "@ignored/ignition-core";
import fs from "fs";

export class CommandJournal implements ICommandJournal {
  constructor(private _path: string) {}

  public async record(command: DeployStateExecutionCommand) {
    return fs.promises.appendFile(
      this._path,
      `${JSON.stringify(command, this._serializeReplacer)}\n`
    );
  }

  private _serializeReplacer(_key: string, value: unknown) {
    if (value instanceof Set) {
      return Array.from(value);
    }

    if (value instanceof Map) {
      return Object.fromEntries(value);
    }

    return value;
  }
}
