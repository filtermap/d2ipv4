import fs from "fs";
import readline from "readline";
import os from "os";
import { Worker, WorkerOptions } from "worker_threads";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import downloadFile from "download-file";
import ipFunctions from "ipfunctions";
import * as ipUtil from "./ipUtil";
import match from "./match";

async function main() {
  const options = commandLineArgs(optionDefinitions);
  if (options.help) {
    console.log(usage);
    return;
  }
  if (!options.name) throw new Error("!options.name");
  if (!options.id) throw new Error("!options.id");
  const { name, id } = options;
  const ip = options.all
    ? await searchAllIPV4Addresses(name, id)
    : await searchJapaneseIPV4Addresses(name, id, !!options.update);
  if (!ip) {
    console.error(`not found: ${nameAndIDToString(name, id)}`);
  }
  console.error(`found: ${nameAndIDToString(name, id)}`);
  console.log(ip);
}

const optionDefinitions = [
  {
    name: "name",
    alias: "n",
    type: String,
    description: "The name."
  },
  {
    name: "id",
    alias: "i",
    type: String,
    description: "The ID."
  },
  {
    name: "all",
    alias: "a",
    type: Boolean,
    description: "Search all IPv4 addresses."
  },
  {
    name: "update",
    alias: "u",
    type: Boolean,
    description: "Update and search the list of IPv4 addresses in Japan."
  },
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "Print this list and exit."
  }
];

const sections = [
  {
    header: "Usage:",
    content: "[options]"
  },
  {
    header: "Available Options:",
    optionList: optionDefinitions
  }
];

const usage = commandLineUsage(sections);

function nameAndIDToString(name: string, id: string): string {
  return `${name} (ID: ${id})`;
}

async function searchAllIPV4Addresses(
  name: string,
  id: string
): Promise<string | undefined> {
  console.error(`search all IPv4 addresses for ${nameAndIDToString(name, id)}`);
  const numberOfWorkers = os.cpus().length;
  const firstIP = "0.0.0.0";
  const lastIP = "255.255.255.255";
  const firstIPLong = ipFunctions.ip2long(firstIP);
  const lastIPLong = ipFunctions.ip2long(lastIP);
  const numberOfIPsForOneWorker = Math.floor(
    (lastIPLong - firstIPLong) / numberOfWorkers
  );
  const promises: Promise<string>[] = [];
  for (let n = 0; n < numberOfWorkers; n++) {
    const firstIPLongForWorker = firstIPLong + numberOfIPsForOneWorker * n;
    const lastIPLongForWorker =
      n === numberOfWorkers - 1
        ? lastIPLong
        : firstIPLongForWorker + numberOfIPsForOneWorker - 1;
    const firstIPForWorker = ipFunctions.long2ip(firstIPLongForWorker);
    const lastIPForWorker = ipFunctions.long2ip(lastIPLongForWorker);
    promises.push(
      new Promise((resolve, reject) => {
        const worker = tsWorker("./worker.ts", {
          workerData: {
            name,
            id,
            firstIP: firstIPForWorker,
            lastIP: lastIPForWorker
          }
        });
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", code => {
          if (code !== 0)
            reject(new Error(`Worker stopped with exit code ${code}`));
        });
      })
    );
  }
  return Promise.race(promises);
}

// https://github.com/TypeStrong/ts-node/issues/676#issuecomment-531620154
function tsWorker(file: string, options: WorkerOptions) {
  options.eval = true;
  if (!options.workerData) {
    options.workerData = {};
  }
  options.workerData.__filename = file;
  return new Worker(
    `const w = require('worker_threads');
require('ts-node').register({ files: true });
const file = w.workerData.__filename;
delete w.workerData.__filename;
require(file);
`,
    options
  );
}

async function searchJapaneseIPV4Addresses(
  name: string,
  id: string,
  update: boolean
) {
  const filename = "ipv4.txt";
  if (!fs.existsSync(filename) || update) {
    const url = "https://ipvx.info/country/range/jp/p/";
    console.error(`download ${url} to ${filename}`);
    await download(url, filename);
  }
  console.error(`search ${filename} for ${nameAndIDToString(name, id)}`);
  const input = fs.createReadStream(filename, "utf8");
  const rl = readline.createInterface({ input });
  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === 1) continue;
    const [firstIP, lastIP] = line.split("-");
    const ip = ipUtil.find(firstIP, lastIP, (ip: string) =>
      match(name, id, ip)
    );
    if (!ip) {
      console.error(`not found in line #${lineNumber}: ${line}`);
      continue;
    }
    console.error(`found in line #${lineNumber}: ${line}`);
    return ip;
  }
}

function download(url: string, filename: string) {
  return new Promise<void>(
    (resolve: () => void, reject: (err: any) => void) => {
      downloadFile(url, { filename }, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
    }
  );
}

main();
