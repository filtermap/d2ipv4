import crypto from "crypto";

function md5hex(str: string) {
  const md5 = crypto.createHash("md5");
  return md5.update(str).digest("hex");
}

export default function match(name: string, id: string, ip: string): boolean {
  return md5hex(name + ip) === id;
}
