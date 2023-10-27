import { UiFuture, UiFutureStatusType, UiState } from "../types";

export function calculateBatchDisplay(
  state: UiState,
  gasBumpMap: Record<string, number>
): {
  text: string;
  height: number;
} {
  const batch = state.batches[state.currentBatch - 1];
  const height = batch.length + 2;

  let text = `Batch #${state.currentBatch}\n`;

  text += batch
    .sort((a, b) => a.futureId.localeCompare(b.futureId))
    .map((v) => _futureStatus(v, gasBumpMap, state.maxFeeBumps))
    .join("\n");

  text += "\n";

  return { text, height };
}

function _futureStatus(
  future: UiFuture,
  gasBumpMap: Record<string, number>,
  maxFeeBumps: number
): string {
  switch (future.status.type) {
    case UiFutureStatusType.UNSTARTED: {
      const gas = gasBumpMap[future.futureId];
      return `  Executing ${future.futureId}${
        gas !== undefined
          ? ` - bumping gas fee (${gas}/${maxFeeBumps})...`
          : "..."
      }`;
    }
    case UiFutureStatusType.SUCCESS: {
      return `  Executed ${future.futureId}`;
    }
    case UiFutureStatusType.TIMEDOUT: {
      return `  Pending ${future.futureId}`;
    }
    case UiFutureStatusType.ERRORED: {
      return `  Failed ${future.futureId}`;
    }
    case UiFutureStatusType.HELD: {
      return `  Held ${future.futureId}`;
    }
  }
}
