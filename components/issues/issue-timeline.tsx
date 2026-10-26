"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  DotIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "cn";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNow } from "@/hooks/use-now";
import type { Activity, Comment } from "@/lib/api/activity";
import type { Label } from "@/lib/api/labels";
import type { Member } from "@/lib/api/members";
import { formatDateTime, formatRelative } from "@/lib/date";
import {
  useActivities,
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from "@/lib/queries/activity";
import { commentBodySchema } from "@/lib/validations/comment";

import { describeActivity } from "./activity-text";
import { Markdown } from "./markdown";
import { MemberAvatar } from "./property-selects";

type Item =
  | { kind: "activity"; at: string; activity: Activity; text: string }
  | { kind: "comment"; at: string; comment: Comment };

// 이슈 상세 아래의 활동 타임라인. 코멘트와 활동 로그를 최신순으로 섞어 보여주고, 최근 10개만 먼저 보여준다.
// useSearchParams를 쓰므로 <Suspense> 안에 있어야 한다 (이슈 페이지의 IssueContent).
export function IssueTimeline({
  workspaceId,
  issueId,
  currentUserId,
  members,
  labels,
  initialComments,
  initialActivities,
}: {
  workspaceId: string;
  issueId: string;
  currentUserId: string;
  members: Member[];
  labels: Label[];
  initialComments: Comment[];
  initialActivities: Activity[];
}) {
  const { data: comments = initialComments } = useComments(
    workspaceId,
    issueId,
    initialComments,
  );
  const { data: activities = initialActivities } = useActivities(
    workspaceId,
    issueId,
    initialActivities,
  );
  const now = useNow();
  const { mode, setMode } = useTimelineMode();
  const [expanded, setExpanded] = useState(false);

  // 최신순. 같은 시각이면 코멘트를 활동보다 위에 둔다(오래된 순일 때 활동이 먼저였던 것의 반대).
  const items: Item[] = [
    ...(mode === "all"
      ? activities.flatMap((activity): Item[] => {
          const text = describeActivity(activity, { members, labels });
          return text
            ? [{ kind: "activity", at: activity.created_at, activity, text }]
            : [];
        })
      : []),
    ...comments.map((comment): Item => ({
      kind: "comment",
      at: comment.created_at,
      comment,
    })),
  ].sort(
    (a, b) =>
      b.at.localeCompare(a.at) ||
      (a.kind === b.kind ? 0 : a.kind === "comment" ? -1 : 1),
  );
  const hiddenCount = Math.max(0, items.length - RECENT_LIMIT);
  const shown = expanded ? items : items.slice(0, RECENT_LIMIT);
  const noun = mode === "all" ? "활동" : "코멘트";

  const member = (id: string | null) =>
    members.find((item) => item.id === id) ?? null;

  return (
    <section aria-label="활동" className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">활동</h2>
        <div
          role="group"
          aria-label="활동 보기"
          className="flex rounded-md border p-0.5"
        >
          {(
            [
              ["all", "전체"],
              ["comments", "코멘트"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                mode === value && "bg-muted font-medium text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* 최신순이라 입력칸을 목록 위에 둔다. 등록한 코멘트가 입력칸 바로 아래에 나타난다. */}
      <CommentComposer
        workspaceId={workspaceId}
        issueId={issueId}
        currentUserId={currentUserId}
      />
      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">아직 코멘트가 없습니다.</p>
      )}
      <ol className="space-y-3">
        {shown.map((item) =>
          item.kind === "activity" ? (
            <li
              key={`a-${item.activity.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <DotIcon className="size-4 shrink-0" />
              <span className="min-w-0">
                <span className="font-medium text-foreground">
                  {member(item.activity.actor_id)?.name ?? "알 수 없는 사용자"}
                </span>{" "}
                님이 {item.text}
              </span>
              <TimeAgo iso={item.at} now={now} />
            </li>
          ) : (
            <CommentItem
              key={`c-${item.comment.id}`}
              comment={item.comment}
              author={member(item.comment.author_id)}
              mine={item.comment.author_id === currentUserId}
              now={now}
            />
          ),
        )}
      </ol>
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="w-full text-muted-foreground"
        >
          {expanded ? (
            <>
              <ChevronUpIcon />
              이전 {noun} 접기
            </>
          ) : (
            <>
              <ChevronDownIcon />
              이전 {noun} {hiddenCount}개 보기
            </>
          )}
        </Button>
      )}
    </section>
  );
}

// 처음에 보여주는 최근 항목 수. 나머지는 "이전 활동 보기"로 펼친다.
const RECENT_LIMIT = 10;

type TimelineMode = "all" | "comments";

// 전체/코멘트 보기. 필터 상태라 URL(?activity=comments)에 둔다(CLAUDE.md).
// 서버에 화면을 다시 요청하지 않도록 replaceState로 바꾼다(use-issue-filters.ts와 같은 방식).
function useTimelineMode() {
  const searchParams = useSearchParams();
  const mode: TimelineMode =
    searchParams.get("activity") === "comments" ? "comments" : "all";

  function setMode(next: TimelineMode) {
    const params = new URLSearchParams(window.location.search);
    if (next === "all") params.delete("activity");
    else params.set("activity", next);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }

  return { mode, setMode };
}

function TimeAgo({ iso, now }: { iso: string; now: number }) {
  return (
    // 서버와 브라우저의 "지금"은 몇 초 다를 수밖에 없어 이 요소만 hydration 불일치 경고를 끈다.
    <time
      dateTime={iso}
      title={formatDateTime(iso)}
      suppressHydrationWarning
      className="shrink-0 text-xs text-muted-foreground"
    >
      · {formatRelative(iso, now)}
    </time>
  );
}

// 코멘트 입력칸의 ⌘/Ctrl+Enter(등록)와 Esc(취소). 한글 조합 중에 ⌘+Enter를 누르면 그 키는 조합을 끝내는 데
// 쓰이므로, 바로 등록하지 않고 예약했다가 조합이 끝나는 순간(compositionend) 등록한다. 이때 상태값 대신
// 입력칸의 실제 값을 넘겨 마지막 글자가 빠지거나 중복되지 않게 한다. 예약하지 않으면 두 번 눌러야 등록된다.
function useModEnterSubmit(
  submit: (value: string) => void,
  cancel?: () => void,
) {
  const pending = useRef(false);
  return {
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const modEnter =
        event.key === "Enter" && (event.metaKey || event.ctrlKey);
      // 예약 뒤에 다른 키를 누르면 예약을 취소한다. ⌘+Enter가 조합을 끝내지 않는 입력기에서
      // 예약이 남아 있다가 나중의 조합 종료 때 원치 않게 등록되는 것을 막는다.
      pending.current = event.nativeEvent.isComposing && modEnter;
      if (event.nativeEvent.isComposing) return;
      if (modEnter) {
        event.preventDefault();
        submit(event.currentTarget.value);
      }
      if (event.key === "Escape" && cancel) {
        event.preventDefault();
        cancel();
      }
    },
    onCompositionEnd: (event: React.CompositionEvent<HTMLTextAreaElement>) => {
      if (!pending.current) return;
      pending.current = false;
      submit(event.currentTarget.value);
    },
  };
}

function CommentItem({
  comment,
  author,
  mine,
  now,
}: {
  comment: Comment;
  author: Member | null;
  mine: boolean;
  now: number;
}) {
  const updateComment = useUpdateComment(
    comment.workspace_id,
    comment.issue_id,
  );
  const deleteComment = useDeleteComment(
    comment.workspace_id,
    comment.issue_id,
  );
  const [draft, setDraft] = useState<string | null>(null);
  // 저장 요청이 끝날 때까지는 수정한 내용을 보여준다 (그 자리 편집 필드와 같은 규칙).
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const editKeys = useModEnterSubmit(save, () => setDraft(null));
  const edited =
    new Date(comment.updated_at).getTime() -
      new Date(comment.created_at).getTime() >
    1000;

  function save(value = draft) {
    if (value === null) return;
    const parsed = commentBodySchema.safeParse(value);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setDraft(null);
    if (parsed.data === comment.body) return;
    setSaving(parsed.data);
    updateComment.mutate(
      { id: comment.id, body: parsed.data },
      { onSettled: () => setSaving(null) },
    );
  }

  return (
    <li className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        {author ? (
          <MemberAvatar member={author} />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px]">
            ?
          </span>
        )}
        <span className="truncate text-sm font-medium">
          {author?.name ?? "알 수 없는 사용자"}
        </span>
        <TimeAgo iso={comment.created_at} now={now} />
        {edited && (
          <span className="text-xs text-muted-foreground">(수정됨)</span>
        )}
        {mine && draft === null && (
          <div className="ml-auto flex">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="코멘트 수정"
              title="수정"
              className="text-muted-foreground"
              onClick={() => setDraft(saving ?? comment.body)}
            >
              <PencilIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="코멘트 삭제"
              title="삭제"
              className="text-muted-foreground"
              onClick={() => setDeleting(true)}
            >
              <Trash2Icon />
            </Button>
          </div>
        )}
      </div>
      {draft === null ? (
        <Markdown className="px-3 py-2">{saving ?? comment.body}</Markdown>
      ) : (
        <div className="space-y-2 p-2">
          <Textarea
            aria-label="코멘트 수정"
            autoFocus
            maxLength={10000}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            {...editKeys}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              취소
            </Button>
            <Button size="sm" onClick={() => save()}>
              저장
            </Button>
          </div>
        </div>
      )}
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>코멘트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 코멘트는 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteComment.mutate(comment.id);
                setDeleting(false);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function CommentComposer({
  workspaceId,
  issueId,
  currentUserId,
}: {
  workspaceId: string;
  issueId: string;
  currentUserId: string;
}) {
  const createComment = useCreateComment(workspaceId, issueId, currentUserId);
  const [body, setBody] = useState("");
  const keys = useModEnterSubmit(submit);

  function submit(value = body) {
    const parsed = commentBodySchema.safeParse(value);
    if (!parsed.success) return;
    createComment.mutate({ id: crypto.randomUUID(), body: parsed.data });
    setBody("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      <Textarea
        aria-label="새 코멘트"
        placeholder="코멘트를 남기세요 (마크다운 지원)"
        maxLength={10000}
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        {...keys}
        className="text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          ⌘ / Ctrl + Enter로 등록
        </span>
        <Button type="submit" size="sm" disabled={!body.trim()}>
          코멘트
        </Button>
      </div>
    </form>
  );
}
