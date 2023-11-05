const fs = require("fs");
const { spawn } = require("child_process");

// Define the root directory of your mono-repo
const monoRepoRoots = [
    `${__dirname}/../microservices_dev`,
    `${__dirname}/../external`,
];

monoRepoRoots.forEach((monoRepoRoot) => {
    // Check if the "already-installed.flag" file exists
    const alreadyInstalled = fs.existsSync(
        `${monoRepoRoot}/already-installed.flag`
    );

    // Get a list of all directories (services) in your mono-repo
    const services = fs
        .readdirSync(monoRepoRoot, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    // Create a function to start a service
    function startService(service) {
        const servicePath = `${monoRepoRoot}/${service}`;

        if (fs.existsSync(`${servicePath}/package.json`)) {
            if (!alreadyInstalled) {
                console.log(`Running "npm install" in ${service}...`);
                const npmInstallResult = spawn("npm", ["install"], {
                    cwd: servicePath,
                    stdio: "inherit",
                });

                npmInstallResult.on("exit", (code) => {
                    if (code === 0) {
                        console.log(`npm install completed for ${service}`);
                        startServiceProcess(service);
                    } else {
                        console.error(
                            `Error running "npm install" in ${service}. Aborting.`
                        );
                    }
                });
            } else if (!fs.existsSync(`${servicePath}/package.json`)) {
                console.warn(
                    `Warning: "package.json" file is missing in ${service}. Skipping "npm install".`
                );
                startServiceProcess(service);
            } else {
                startServiceProcess(service);
            }
        } else {
            console.log(
                `Skipping ${service} as it does not have a "package.json" file.`
            );
        }
    }

    // Create a function to start a service process
    function startServiceProcess(service) {
        const servicePath = `${monoRepoRoot}/${service}`;
        const serviceProcess = spawn("npm", ["start"], {
            cwd: servicePath,
            stdio: "inherit",
        });

        serviceProcess.on("exit", (code) => {
            if (code === 0) {
                console.log(`Service "${service}" started successfully.`);
            } else {
                console.error(
                    `Service "${service}" encountered an error during startup. (Exit code: ${code})`
                );
            }
        });
    }

    // Start each service individually
    services.forEach((service) => {
        startService(service);
    });
});
