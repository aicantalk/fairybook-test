import { headers } from "next/headers";

export function getServerBaseUrl() {
  const headerList = headers();
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  return `${protocol}://${host}`;
}
