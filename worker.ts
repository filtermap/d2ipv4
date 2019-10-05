import { isMainThread, parentPort, workerData } from "worker_threads";
import * as ipUtil from "./ipUtil";
import match from "./match";

if (isMainThread) throw new Error("isMainThread");
if (!parentPort) throw new Error("!parentPort");
const { name, id, firstIP, lastIP } = workerData;
const ip = ipUtil.find(firstIP, lastIP, ip => match(name, id, ip));
parentPort.postMessage(ip);
