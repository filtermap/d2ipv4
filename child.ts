import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import ipFunctions from "ipfunctions";
import * as ipUtil from "./ipUtil";
import match from "./match";

function main() {
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
      name: "first",
      alias: "f",
      type: String,
      description: "First IPv4 address."
    },
    {
      name: "last",
      alias: "l",
      type: String,
      description: "Last IPv4 addres."
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
        content: "-n <name> -i <id> -f <first ip address> -l <last ip address>"
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
  const name = options.name;
  const id = options.id;
  const firstIP = options.first;
  const lastIP = options.last;
  console.error(`start to search ${firstIP}-${lastIP}`);
  const firstIPLong = ipFunctions.ip2long(firstIP);
  const lastIPLong = ipFunctions.ip2long(lastIP);
  const numberOfIPAddresses = lastIPLong - firstIPLong + 1;
  const lot = 1000000;
  const numberOfLots = Math.ceil(numberOfIPAddresses / lot);
  let numberOfSearchedIPAddresses = 0;
  for (let n = 0; n < numberOfLots; n++) {
    const firstIPLongOnThisLot = firstIPLong + lot * n;
    const lastIPLongOnThisLot =
      n === numberOfLots - 1 ? lastIPLong : firstIPLongOnThisLot + lot - 1;
    const firstIPOnThisLot = ipFunctions.long2ip(firstIPLongOnThisLot);
    const lastIPOnThisLot = ipFunctions.long2ip(lastIPLongOnThisLot);
    const ip = ipUtil.find(firstIPOnThisLot, lastIPOnThisLot, ip =>
      match(name, id, ip)
    );
    if (!ip) {
      numberOfSearchedIPAddresses +=
        lastIPLongOnThisLot - firstIPLongOnThisLot + 1;
      console.error(
        `not found in ${firstIPOnThisLot}-${lastIPOnThisLot} ${numberOfSearchedIPAddresses} addresses (${(
          numberOfSearchedIPAddresses / numberOfIPAddresses
        ).toFixed(2)}%)`
      );
      continue;
    }
    console.error(`found in ${firstIPOnThisLot}-${lastIPOnThisLot}`);
    console.log(ip);
    return;
  }
}

main();
