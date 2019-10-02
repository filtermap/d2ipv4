import childProcess from "child_process";
import fs from "fs";
import os from "os";
import readline from "readline";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import downloadFile from "download-file";
import ipFunctions from "ipfunctions";
import * as ipUtil from "./ipUtil";
import match from "./match";

const url = "https://ipvx.info/country/range/jp/p/";

async function main() {
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
  const options = commandLineArgs(optionDefinitions);
  if (options.help) {
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
    console.log(usage);
    return;
  }
  if (!options.name) throw new Error("!options.name");
  const name = options.name;
  console.error(`name: ${name}`);
  if (!options.id) throw new Error("!options.id");
  const id = options.id;
  console.error(`id: ${id}`);
  if (options.all) {
    const firstIP = "0.0.0.0";
    const lastIP = "255.255.255.255";
    const firstIPLong = ipFunctions.ip2long(firstIP);
    const lastIPLong = ipFunctions.ip2long(lastIP);
    const numberOfAvailableCores = os.cpus().length - 1;
    const numberOfIPAddressesForOneProcess = Math.floor(
      (lastIPLong - firstIPLong) / numberOfAvailableCores
    );
    const processes: childProcess.ChildProcess[] = [];
    return new Promise(resolve => {
      for (let core = 0; core < numberOfAvailableCores; core++) {
        const firstIPLongForProcess =
          firstIPLong + numberOfIPAddressesForOneProcess * core;
        const lastIPLongForProcess =
          core === numberOfAvailableCores - 1
            ? lastIPLong
            : firstIPLongForProcess + numberOfIPAddressesForOneProcess - 1;
        const firstIPForProcess = ipFunctions.long2ip(firstIPLongForProcess);
        const lastIPForProcess = ipFunctions.long2ip(lastIPLongForProcess);
        const child = childProcess.exec(
          `ts-node --files child.ts -n ${name} -i ${id} -f ${firstIPForProcess} -l ${lastIPForProcess}`
        );
        if (!child.stderr) throw new Error("!child.stderr");
        child.stderr.on("data", data =>
          console.error(`process #${core}: ${data.toString()}`)
        );
        if (!child.stdout) throw new Error("!child.stdout");
        child.stdout.on("data", data => {
          processes.forEach(process => process.kill());
          resolve(data.toString());
        });
        processes.push(child);
      }
    });
  }
  const filename = "ipv4.txt";
  if (!fs.existsSync(filename) || options.update) {
    console.error(`download: ${url} to ${filename}`);
    await download(url, filename);
  }
  const input = fs.createReadStream(filename, "utf8");
  const reader = readline.createInterface({ input });
  let lineNumber = 0;
  return new Promise(resolve => {
    reader.on("close", () => resolve);
    reader.on("line", line => {
      lineNumber++;
      if (lineNumber === 1) return;
      const [firstIP, lastIP] = line.split("-");
      const ip = ipUtil.find(firstIP, lastIP, (ip: string) =>
        match(name, id, ip)
      );
      if (!ip) {
        console.error(`not found in line #${lineNumber}: ${line}`);
        return;
      }
      reader.close();
      input.destroy();
      return resolve(ip);
    });
  });
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

main().then(ip => console.log(ip));
