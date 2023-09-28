import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import { Tooltip } from "react-tooltip";
import styled, { css } from "styled-components";
import { Mermaid } from "../../../components/mermaid";
import { toEscapedId } from "../../../utils/to-mermaid";
import { useState } from "react";

export const DeploymentFlow: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
}> = ({ ignitionModule, batches }) => {
  const escapedIdMap = batches.reduce((acc, batch, i) => {
    const batchId = `batch-${i}`;

    const escapedFutureIds = batch.map(toEscapedId);

    return {
      ...acc,
      [batchId]: escapedFutureIds,
    };
  }, {} as Record<string, string[]>);

  const [currentlyHovered, setCurrentlyHovered] = useState("");

  const futuresToHighlight = escapedIdMap[currentlyHovered] || [];

  return (
    <div>
      <SectionHeader>
        Deployment flow <FlowTooltip />
      </SectionHeader>

      <BatchBtnSection>
        Visualize batches:{" "}
        {batches.map((_, i) => (
          <BatchBtn
            key={`batch-btn-${i}`}
            onMouseEnter={() => setCurrentlyHovered(`batch-${i}`)}
            onMouseLeave={() => setCurrentlyHovered("")}
          >
            Batch <strong>#{i + 1}</strong>
          </BatchBtn>
        ))}
      </BatchBtnSection>

      <HighlightedFutures futures={futuresToHighlight}>
        <Mermaid ignitionModule={ignitionModule} />
      </HighlightedFutures>
    </div>
  );
};

const FlowTooltip = () => (
  <span style={{ fontSize: "1.25rem" }}>
    <a data-tooltip-id="flow-tooltip">ℹ️</a>
    <Tooltip className="styled-tooltip flow-tooltip" id="flow-tooltip">
      <div style={{ fontWeight: 700 }}>Diagram reference</div>
      <br />
      <span>Future to future dependency</span>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <span>---&gt;</span>
      <br />
      <span>Module to module dependency</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>- - -&gt;</span>
    </Tooltip>
  </span>
);

const HighlightedFutures = styled.div<{ futures: string[] }>`
  ${({ futures }) =>
    futures.map(
      (id) =>
        css`
          g[id^="flowchart-${id}"] rect {
            fill: lightgreen !important;
          }
        `
    )}
`;

const SectionHeader = styled.div`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const BatchBtnSection = styled.div`
  margin-bottom: 1rem;
`;

const BatchBtn = styled.span`
  font-size: 0.8rem;
  background: #f2efef;
  width: 86px;
  text-align: center;
  padding: 0.3rem 1rem;
  margin: auto 0.5rem;
`;
