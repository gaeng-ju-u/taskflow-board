"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresence, type PresenceUser } from "@/lib/realtime/presence";

const MAX_SHOWN = 3;

// 같은 이슈·프로젝트를 지금 보고 있는 다른 사람들. 나는 빼고, 아무도 없으면 그리지 않는다.
export function PresenceAvatars({
  topic,
  me,
}: {
  topic: string;
  me: PresenceUser | null;
}) {
  const others = usePresence(topic, me).filter((user) => user.id !== me?.id);
  if (others.length === 0) return null;

  const names = others.map((user) => user.name).join(", ");
  const hidden = others.length - MAX_SHOWN;

  return (
    <div
      role="status"
      aria-label={`${names} 보는 중`}
      title={`${names} 보는 중`}
      className="flex items-center gap-1.5"
    >
      <div className="flex -space-x-1.5">
        {others.slice(0, MAX_SHOWN).map((user) => (
          <Avatar key={user.id} className="size-6 ring-2 ring-background">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="text-[10px]">
              {user.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {hidden > 0 && (
        <span className="text-xs text-muted-foreground">+{hidden}</span>
      )}
      <span className="hidden text-xs text-muted-foreground sm:inline">
        보는 중
      </span>
    </div>
  );
}
