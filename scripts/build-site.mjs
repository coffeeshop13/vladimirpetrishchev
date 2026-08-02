import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const referenceDirectory = resolve(projectRoot, "reference-deployment");
const outputDirectory = resolve(projectRoot, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(referenceDirectory, outputDirectory, { recursive: true });

console.log(`Prepared ${outputDirectory} from the imported website deployment.`);
