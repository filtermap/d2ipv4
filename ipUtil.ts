import ipFunctions from "ipfunctions";

export function find(
  firstIP: string,
  lastIP: string,
  callback: (ip: string) => boolean
): string | undefined {
  const firstIPLong = ipFunctions.ip2long(firstIP);
  const lastIPLong = ipFunctions.ip2long(lastIP);
  for (let ipLong = firstIPLong; ipLong <= lastIPLong; ipLong++) {
    const ip = ipFunctions.long2ip(ipLong);
    if (callback(ip)) return ip;
  }
}
