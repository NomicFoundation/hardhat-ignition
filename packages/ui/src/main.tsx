import React from "react";

import {
  IgnitionModule,
  IgnitionModuleDeserializer,
  IgnitionModuleResult,
} from "@ignored/ignition-core/ui-helpers";
import ReactDOM from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { FutureDetails } from "./pages/future-details/future-details";
import { VisualizationOverview } from "./pages/visualization-overview/visualization-overview";

const loadDeploymentFromEmbeddedDiv = (): IgnitionModule<
  string,
  string,
  IgnitionModuleResult<string>
> | null => {
  const scriptTag = document.getElementById("deployment");

  if (scriptTag === null || scriptTag.textContent === null) {
    return null;
  }

  const data = JSON.parse(scriptTag.textContent);

  if (data.unloaded) {
    return null;
  }

  return IgnitionModuleDeserializer.deserialize(data.module);
};

const loadDeploymentFromDevFile = async () => {
  const response = await fetch("./deployment.json");
  const data = await response.json();
  return IgnitionModuleDeserializer.deserialize(data.module);
};

const loadDeploymentData = () => {
  return loadDeploymentFromEmbeddedDiv() ?? loadDeploymentFromDevFile();
};

const main = async () => {
  try {
    const ignitionModule = await loadDeploymentData();

    const router = createHashRouter([
      {
        path: "/",
        element: <VisualizationOverview ignitionModule={ignitionModule} />,
      },
      {
        path: "/future/:futureId",
        element: <FutureDetails ignitionModule={ignitionModule} />,
      },
    ]);

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>
    );
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "unknown error";

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <div>
        <h2>
          Error during deployment loading: <em>{message}</em>
        </h2>
      </div>
    );
  }
};

main();
