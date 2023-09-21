import {
  Future,
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { SummaryHeader } from "../../../components/summary-header";
import {
  getAllCallFuturesFor,
  getAllDeployFuturesFor,
} from "../../../queries/futures";

export const VisualizationSummary: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  const deployFutures = useMemo(
    () => getAllDeployFuturesFor(ignitionModule),
    [ignitionModule]
  );
  const callFutures = useMemo(
    () => getAllCallFuturesFor(ignitionModule),
    [ignitionModule]
  );

  return (
    <div>
      <SummaryHeader />

      <p>
        The successful completion of the deployment will apply{" "}
        {deployFutures.length + callFutures.length} updates on-chain:
      </p>

      <SummaryColumns>
        {deployFutures.length === 0 ? null : (
          <SummaryColumn>
            <h4>{deployFutures.length} deploys</h4>
            <ul>
              {deployFutures.map((deploy) => (
                <li key={deploy.id}>
                  <Link to={toFutureDetailsUrl(deploy)}>
                    <strong>{deploy.id}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          </SummaryColumn>
        )}

        {callFutures.length === 0 ? null : (
          <SummaryColumn>
            <h4>{callFutures.length} calls</h4>
            <ul>
              {callFutures.map((call) => (
                <li key={call.id}>
                  <Link to={toFutureDetailsUrl(call)}>
                    <strong>{call.id}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          </SummaryColumn>
        )}
      </SummaryColumns>
    </div>
  );
};

function toFutureDetailsUrl(future: Future): string {
  return `/future/${encodeURIComponent(future.id)}`;
}

const SummaryColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
`;

const SummaryColumn = styled.div`
  h4 {
    text-decoration: underline;
  }
`;
