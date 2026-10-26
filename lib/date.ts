// 서버와 브라우저가 같은 문자열을 만들도록 숫자만 Intl로 구하고 한국어 표기는 직접 붙인다.
// 시간대를 고정해도 ko-KR 로캘 표기("오후"/"PM" 등)는 실행 환경의 ICU 데이터에 따라 달라 hydration 불일치가 난다.
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function seoulParts(iso: string) {
  const values = Object.fromEntries(
    parts.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return values as Record<"year" | "month" | "day" | "hour" | "minute", string>;
}

// 2026년 10월 14일
export function formatDate(iso: string) {
  const { year, month, day } = seoulParts(iso);
  return `${year}년 ${month}월 ${day}일`;
}

// 10월 25일 12:00
export function formatDateTime(iso: string) {
  const { month, day, hour, minute } = seoulParts(iso);
  return `${month}월 ${day}일 ${hour}:${minute}`;
}

// 방금, 3분 전, 2시간 전, 어제, 그 이전은 날짜. now를 받아 렌더 중에 Date.now()를 부르지 않게 한다.
export function formatRelative(iso: string, now: number) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  if (hours < 48) return "어제";
  return formatDate(iso);
}
