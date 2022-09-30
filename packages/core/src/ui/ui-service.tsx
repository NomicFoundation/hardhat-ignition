import { render } from "ink";

import { DeployState } from "types/deployment";

import { IgnitionUi } from "./components";

export class UiService {
  private _enabled: boolean;

  constructor({ enabled }: { enabled: boolean }) {
    this._enabled = enabled;
  }

  public render(state: DeployState) {
    if (!this._enabled) {
      return;
    }

    render(<IgnitionUi deployState={state} />);
  }
}
