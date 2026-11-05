// 데모 모드 상수. DB 마이그레이션(demo_mode)의 값과 같아야 한다.
// 모든 방문자가 이 계정 하나로 로그인하고, 데모 워크스페이스는 매시 정각에 초기화된다(pg_cron).
export const DEMO_EMAIL = "demo@taskflow.example";
export const DEMO_WORKSPACE_SLUG = "taskflow-demo";

// 데모 계정과 가상 팀원이 쓰는 도메인. .example은 예약 도메인이라 실제로 메일을 받는 사람이 없다.
const DEMO_DOMAIN = "@taskflow.example";

export function isDemoEmail(email: string) {
  return email.toLowerCase() === DEMO_EMAIL;
}

// 매직 링크로 로그인할 수 없는 주소 (데모 계정, 가상 팀원). 받을 수 없는 주소로 메일을 보내지 않는다.
export function isReservedDemoEmail(email: string) {
  return email.toLowerCase().endsWith(DEMO_DOMAIN);
}
