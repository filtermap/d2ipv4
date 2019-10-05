import fs from "fs";
import readline from "readline";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import downloadFile from "download-file";
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
    ? searchAllIPV4Addresses(name, id)
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

function searchAllIPV4Addresses(name: string, id: string): string | undefined {
  console.error(`search all IPv4 addresses for ${nameAndIDToString(name, id)}`);
  return ipUtil.find("0.0.0.0", "255.255.255.255", ip => match(name, id, ip));
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
