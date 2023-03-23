import { Box, Text, render } from "ink";

import { StatusPanel, StatusPanelData } from "./StatusPanel";

export function renderInfo(data: StatusPanelData[]) {
  render(<InfoView data={data} />);
}

const InfoView = ({ data }: { data: StatusPanelData[] }) => {
  return (
    <Box flexDirection="column" margin={1}>
      {...data.map((panelData) => (
        <Box flexDirection="row">
          <StatusPanel data={panelData} />
        </Box>
      ))}
    </Box>
  );
};
