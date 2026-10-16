# TaskFlow Board 구현 계획

팀용 이슈 트래커(Jira/Linear 스타일). 프론트엔드 포트폴리오 프로젝트.

## 확정된 결정

- 협업 범위: 팀용 (워크스페이스, 멤버 초대, 담당자)
- MVP 기능: 프로젝트·이슈 CRUD·상태, 우선순위·라벨, 코멘트·활동 로그, 서브이슈, 사이클
- 차별화: 실시간 동기화 (Supabase Realtime), 다크모드 테마 전환
- 백엔드: Supabase (Auth, Postgres, RLS, Realtime), 배포는 Vercel
- 일정: 2~3주. 1주차 끝에 배포된 핵심 버전을 만들고, 일정이 밀리면 3주차 항목(서브이슈, 사이클)을 뒤로 미룬다.

## 기술 스택

| 영역       | 선택                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript                                                                     |
| 스타일/UI  | Tailwind 4, shadcn/ui (Base UI), lucide-react                                                                     |
| 테마       | 직접 구현: 인라인 스크립트(첫 페인트 전 적용) + useSyncExternalStore 훅. next-themes는 2025-03 이후 미관리라 제외 |
| 백엔드     | Supabase (`@supabase/supabase-js`, `@supabase/ssr`)                                                               |
| 서버 상태  | TanStack Query (낙관적 업데이트, Realtime으로 캐시 갱신)                                                          |
| DnD        | dnd-kit                                                                                                           |
| 폼/검증    | React Hook Form + Zod                                                                                             |
| 인증 가드  | `proxy.ts` (Next 16에서 middleware 대체)                                                                          |
| 포맷팅     | Prettier + prettier-plugin-tailwindcss                                                                            |

## 데이터 모델

- `profiles` (id = auth.users.id, name, avatar_url)
- `workspaces` (id, name, slug), `workspace_members` (workspace_id, user_id, role: owner/member)
- `invitations` (workspace_id, email, token, expires_at)
- `projects` (workspace_id, name, key 예: "TF", issue_seq)
- `issues` (project_id, number, title, description, status, priority, assignee_id, parent_id, cycle_id, sort_order, created_by)
  - status: backlog / todo / in_progress / done / canceled
  - priority: none / low / medium / high / urgent
- `labels` (workspace_id, name, color), `issue_labels` (issue_id, label_id)
- `comments` (issue_id, author_id, body)
- `activities` (issue_id, actor_id, type, payload jsonb): DB 트리거로 자동 기록
- `cycles` (project_id, name, starts_at, ends_at)

**RLS**: 모든 테이블에 "해당 workspace 멤버만 읽기/쓰기" 정책. 헬퍼 함수(`private.is_workspace_member` 등)는 API에 노출되지 않는 `private` 스키마에 둔다. `issues`, `comments`는 RLS와 Realtime 필터를 위해 `workspace_id`를 비정규화했다(트리거가 채움). 초대 수락은 `accept_invitation(token)` RPC로 한다. 검증: `npm run test:db`
**이슈 번호**: `TF-123` 형식. insert 트리거가 `projects.issue_seq`를 증가시켜 번호를 매긴다.

## 라우트 구조

```
app/
  (auth)/login/page.tsx                              GitHub OAuth, 매직링크, 데모 로그인
  auth/callback/route.ts                             OAuth 콜백
  (app)/[workspace]/layout.tsx                       사이드바, 테마 토글
  (app)/[workspace]/projects/[key]/board/page.tsx    칸반 보드
  (app)/[workspace]/projects/[key]/list/page.tsx     리스트 뷰
  (app)/[workspace]/issues/[id]/page.tsx             이슈 상세
  (app)/[workspace]/cycles/[id]/page.tsx             사이클 상세
  (app)/[workspace]/settings/members/page.tsx        멤버 관리
  invite/[token]/page.tsx                            초대 수락
proxy.ts                                             비로그인 리다이렉트
```

## 진행 체크리스트

### 0단계: 문서와 규칙

- [x] `docs/PLAN.md`, `CLAUDE.md` 작성
- [x] Prettier 설정

### 1주차: 기반과 핵심 흐름 (끝나면 배포)

- [x] shadcn 초기화, 다크모드 (깜빡임 방지)
- [x] Supabase 프로젝트 생성, 스키마·RLS 마이그레이션, 타입 생성, RLS 테스트(pgTAP 16개)
- [x] 인증 (GitHub OAuth, 매직링크), `proxy.ts` 가드, 첫 로그인 시 워크스페이스 생성
- [x] 프로젝트 CRUD: TanStack Query 도입, 사이드바, 생성·이름 변경·삭제 (낙관적 업데이트)
- [x] 이슈 CRUD (상태·우선순위·담당자), 이슈 목록·상세 (`/[workspace]/issue/TF-12`), 오프라인 처리
- [ ] 칸반 보드 + dnd-kit, 낙관적 업데이트
- [ ] Vercel 배포, 환경 변수 설정

### 2주차: 협업과 실시간

- [ ] 멤버 초대 (토큰 링크), 역할
- [ ] 라벨, 리스트 뷰, 필터·정렬 (URL 상태)
- [ ] 이슈 상세: 마크다운 설명, 코멘트, 활동 로그
- [ ] Realtime: issues/comments 구독 → Query 캐시 패치, Presence 아바타

### 3주차: 확장과 마감 (밀리면 여기서 자른다)

- [ ] 서브이슈 (부모·자식 관계, 진행률)
- [ ] 사이클 (생성, 이슈 배정, 진행률)
- [ ] 데모 모드: 시드 데이터 워크스페이스, 원클릭 데모 로그인, 주기적 초기화
- [ ] 빈 상태, 로딩 스켈레톤, 에러 바운더리, 반응형
- [ ] README: 스크린샷/GIF, 아키텍처, 기술적 결정과 이유

## 검증

- 각 단계마다 `npm run lint`, `npm run build` 통과
- RLS: 다른 계정 두 개로 서로의 워크스페이스 데이터가 안 보이는지 확인
- Realtime: 브라우저 두 개로 카드 이동과 코멘트가 즉시 반영되는지 확인
- 다크모드: 새로고침할 때 테마가 깜빡이지 않는지 확인
- 배포본에서 데모 로그인 → 이슈 생성 → 이동 흐름 점검
- (여유 시) Playwright E2E 1개: 로그인 → 이슈 생성 → 보드 이동

## 알려진 문제

### 개발 서버 재시작 직후 페이지 새로고침 반복 (원인 미확정, 2026-10-15)

- **증상**: `npm run dev` 재시작 후 워크스페이스 화면이 약 0.1초 간격으로 계속 새로고침된다(깜빡임). 브라우저 콘솔에 `The server could not finish this Suspense boundary`가 반복된다.
- **해결 방법(임시)**: 브라우저의 정지(X) 버튼을 누르거나 사이트 데이터를 지우면 멈추고, 이후에는 정상 동작한다.
- **확인된 것**
  - Suspense 에러는 원인이 아니라 결과다. 스트리밍 도중 새로고침되어 끝나지 않은 경계마다 찍힌다.
  - 앱 코드에는 새로고침·이동을 일으키는 코드가 없다.
  - `next-instant-navigation-testing` 쿠키는 없었다(가설 기각).
  - 헤드리스 Chrome에서는 재현되지 않았다: 콜드 서버, 탭 2개, 탭을 연 채 서버 재시작, 실제 세션, 큰(조각난) 쿠키, 토큰 갱신.
- **다음에 발생하면**: 정지하기 전에 DevTools Network(Preserve log, Doc 필터)에서 반복되는 요청의 **Initiator**를 확인하고, Application → Service workers에 등록된 것이 있는지 본다. 로그(`.next/dev/logs/next-development.log`)는 서버 재시작 시 지워지므로 서버를 켠 채로 확인한다.
- **후보 실험**: `next.config.ts`의 `partialPrefetching`을 끄고 재시작을 여러 번 반복해 재발 여부를 비교한다.
