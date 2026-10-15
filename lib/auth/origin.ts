import { headers } from "next/headers";

// Server Action에서 OAuth/매직링크가 돌아올 주소의 origin을 구한다. 로컬과 Vercel 배포 모두 동작한다.
export async function getRequestOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}
