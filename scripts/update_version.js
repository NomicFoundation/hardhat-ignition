const { execSync } = require("child_process");
const { readdir } = require("fs/promises");
const path = require("path");

const PackageJson = require("@npmcli/package-json");

const allowedVersionChangeSizes = ["major", "minor", "patch"];

const main = async () => {
  const versionChangeSize = process.argv[2];

  if (!allowedVersionChangeSizes.includes(versionChangeSize)) {
    throw new Error(
      `Must give a version change either:\n\nnpm run update-version ${allowedVersionChangeSizes.join(
        ", "
      )}`
    );
  }

  // Run the npm version update
  execSync(
    `npm version --no-git-tag-version --workspaces ${versionChangeSize}`,
    { stdio: "inherit" }
  );

  // Apply all the things the npm version command misses

  const uiPkgJson = await PackageJson.load("./packages/ui");

  const newVersion = uiPkgJson.content.version;

  console.log(`\nUpdating versions to ${newVersion} ...`);
  console.log("  - update ui/package.json devDependencies");
  await updateDevDependencies("./packages/ui", {
    "@nomicfoundation/ignition-core": `^${newVersion}`,
  });

  console.log("  - update hardhat-plugin/package.json dependencies");
  await updateDependencies("./packages/hardhat-plugin", {
    "@nomicfoundation/ignition-core": `^${newVersion}`,
    "@nomicfoundation/ignition-ui": `^${newVersion}`,
  });

  console.log("  - update examples devDependencies");
  const exampleDevDependencies = {
    "@nomicfoundation/hardhat-ignition": `^${newVersion}`,
  };

  const examples = await getDirectories("./examples");

  for (const example of examples) {
    await updateDevDependencies(
      path.join("./examples", example),
      exampleDevDependencies
    );
  }

  console.log(`\nApplying final npm install\n`);
  execSync(`npm install`, { stdio: "inherit" });
};

async function updateDependencies(packagePath, dependencies) {
  const pkgJson = await PackageJson.load(packagePath);

  pkgJson.update({
    dependencies: {
      ...pkgJson.content.dependencies,
      ...dependencies,
    },
  });

  await pkgJson.save();
}

async function updateDevDependencies(packagePath, devDependencies) {
  const pkgJson = await PackageJson.load(packagePath);

  pkgJson.update({
    devDependencies: {
      ...pkgJson.content.devDependencies,
      ...devDependencies,
    },
  });

  await pkgJson.save();
}

async function getDirectories(source) {
  return (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
