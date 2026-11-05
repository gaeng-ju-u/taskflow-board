import { InfoIcon } from "lucide-react";

// 데모 계정으로 들어왔을 때 화면 위에 보여준다. 모든 방문자가 같은 계정과 데이터를 쓴다.
export function DemoBanner() {
  return (
    <div
      role="note"
      className="flex items-center justify-center gap-2 border-b bg-muted/60 px-4 py-2 text-center text-xs text-muted-foreground"
    >
      <InfoIcon className="size-3.5 shrink-0" />
      <span>
        데모 계정으로 둘러보는 중입니다. 바꾼 내용은 다른 방문자에게도 보이며,
        매시 정각에 처음 상태로 초기화됩니다.
      </span>
    </div>
  );
}
