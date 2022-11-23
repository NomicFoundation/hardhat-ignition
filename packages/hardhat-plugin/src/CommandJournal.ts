import {
  DeployStateExecutionCommand,
  ICommandJournal,
} from "@ignored/ignition-core";
import fs from "fs";
import ndjson from "ndjson";

export class CommandJournal implements ICommandJournal {
  constructor(private _path: string) {}

  public async record(command: DeployStateExecutionCommand) {
    return fs.promises.appendFile(
      this._path,
      `${JSON.stringify(command, this._serializeReplacer)}\n`
    );
  }

  public read(): AsyncGenerator<DeployStateExecutionCommand, void, unknown> {
    return readFromNdjsonFile(this._path);
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

async function* readFromNdjsonFile(ndjsonFilePath: string) {
  if (!fs.existsSync(ndjsonFilePath)) {
    return;
  }

  const stream = fs.createReadStream(ndjsonFilePath).pipe(ndjson.parse());

  for await (const chunk of stream) {
    yield chunk as DeployStateExecutionCommand;
  }
}
