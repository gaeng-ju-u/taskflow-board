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
- [x] 칸반 보드 + dnd-kit, 낙관적 업데이트 (목록/보드 탭, 키보드 드래그)
- [x] Vercel 배포, 환경 변수 설정 (2026-10-18)

### 2주차: 협업과 실시간

- [x] 멤버 초대 (토큰 링크), 역할: 멤버 화면, 초대 링크, 역할 변경·내보내기·나가기, 마지막 관리자 보호 (pgTAP 15개 추가)
- [x] 라벨: 라벨 관리 화면, 이슈 라벨 선택(검색·바로 만들기), 목록·보드·상세 표시 (pgTAP 8개 추가)
- [x] 리스트 뷰, 필터·정렬 (URL 상태): 상태·우선순위·담당자(나에게 할당)·라벨·제목 필터, 정렬 5종, 그룹 5종, 목록·보드 공통
- [x] 이슈 상세: 마크다운 설명, 코멘트(수정·삭제), 활동 로그(코멘트와 한 타임라인, 최신순·최근 10개·코멘트만 보기, 라벨·설명 변경 기록 추가, pgTAP 8개 추가)
- [x] Realtime 동기화: 이슈·코멘트·이슈 라벨·라벨·프로젝트 변경을 구독해 Query 캐시에 반영, 다른 사람이 바꾼 항목 강조 (pgTAP 6개 추가)
- [ ] Realtime Presence: 이슈 상세와 프로젝트 화면 제목 옆에 접속자 아바타 (비공개 채널, 워크스페이스 멤버만)

### 3주차: 확장과 마감 (밀리면 여기서 자른다)

- [ ] 서브이슈 (부모·자식 관계, 진행률)
- [ ] 사이클 (생성, 이슈 배정, 진행률)
- [ ] 데모 모드: 시드 데이터 워크스페이스, 원클릭 데모 로그인, 주기적 초기화
- [ ] 빈 상태, 로딩 스켈레톤, 에러 바운더리, 반응형
- [ ] README: 스크린샷/GIF, 아키텍처, 기술적 결정과 이유

### 이후 후보 (3주차 뒤 여유가 있을 때)

- [ ] 나와 관련된 알림(나에게 할당, 내 이슈 코멘트, 멘션)과 이를 켜고 끄는 "내 설정" 화면. 다른 사람의 모든 변경을 알리면 시끄러워 꺼진 채로 남기 쉬워서, 실시간 동기화에서는 알림 대신 바뀐 항목 강조만 넣었다 (2026-10-29 결정)

## 배포

- **주소**: https://taskflow-board-tau.vercel.app
- **플랫폼**: Vercel Hobby. GitHub `main` 머지 시 자동 배포, PR마다 Preview 배포
- **함수 실행 지역**: `icn1`(서울). Supabase(서울)와 같은 지역. 기본값 `iad1`(미국 동부)에서는 DB 왕복이 쌓여 화면 이동에 2~3초 걸렸음. 응답 헤더 `x-vercel-id`의 두 번째 값으로 실행 지역 확인 (`icn1::icn1::...`)
- **Vercel 환경 변수**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Config 타입, Production·Preview·Development). 빌드 시 코드에 포함되므로 변경 후 재배포 필요. Vercel의 Supabase 연동 기능은 사용하지 않음(비밀 키까지 저장되고 변수 이름이 다를 수 있음)
- **Supabase Auth URL 설정**: Site URL은 배포 주소. Redirect URLs는 `https://taskflow-board-tau.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`, `http://localhost:3000/**`
  - 로그인 요청 주소에는 `?next=...`가 붙는다. Site URL과 도메인이 다른 localhost는 Redirect URLs와 전체 주소로 비교되어 `/auth/callback`만으로는 맞지 않고, Site URL(배포 주소)로 보내진다. `/**` 와일드카드로 해결 (2026-10-19)
- **Preview 배포에서는 로그인 불가**: Preview 주소가 Redirect URLs에 없음. 필요 시 와일드카드 주소 등록
- **무료 플랜 주의**: Supabase 무료 프로젝트는 일정 기간 접속이 없으면 일시정지

## 검증

- 각 단계마다 `npm run lint`, `npm run build` 통과
- RLS: 다른 계정 두 개로 서로의 워크스페이스 데이터가 안 보이는지 확인
- Realtime: 브라우저 두 개로 카드 이동과 코멘트가 즉시 반영되는지 확인
- 다크모드: 새로고침할 때 테마가 깜빡이지 않는지 확인
- 배포본에서 데모 로그인 → 이슈 생성 → 이동 흐름 점검
- (여유 시) Playwright E2E 1개: 로그인 → 이슈 생성 → 보드 이동

## 알려진 문제

### 개발 서버 무한 새로고침 (발생 원리 확인, 발생 조건 미확정, 2026-10-15 / 2026-10-21 갱신)

- **증상**: 워크스페이스 화면이 약 0.1초 간격으로 계속 새로고침된다(깜빡임). 서버 로그에 `✓ Compiled in 0~3ms`, 브라우저 콘솔에 `The server could not finish this Suspense boundary`가 반복된다.
- **해결 방법(임시)**: 그 브라우저의 사이트 데이터(캐시)를 지우고 다시 접속하거나, 개발 서버를 재시작한다.
- **발생 원리 (재현으로 확인)**
  - 고장 상태의 개발 서버는 앱 기본 청크 목록을 구독(`turbopack-subscribe`)하는 브라우저에 `"type":"restart"` 업데이트를 보낸다. Turbopack 브라우저 런타임은 `restart`를 받으면 페이지 전체를 새로고침하고, 새 페이지가 다시 구독해 반복된다.
  - 확인 방법: 서버를 켠 채 `/_next/hmr` 웹소켓에 접속해 메인 청크 목록을 구독하고 응답에 `restart`가 오는지 본다. 정상이면 메시지가 오지 않는다.
  - `Compiled` 로그는 구독할 때 첫 응답으로 실제 업데이트가 갈 때 찍히는 것이다(`hot-reloader-turbopack.js`). 파일 변경과는 무관하다. Suspense 에러는 불러오는 도중 새로고침되어 생기는 결과다.
  - 고장 상태에서는 쿠키 없는 새 브라우저도 반복된다. 서비스 워커는 없었다.
- **원인이 아닌 것 (실험으로 제외)**: 디스크 캐시(`.next/dev/cache`, 같은 캐시로 재시작 6회 정상), 서버를 켜는 방법(VS Code 터미널 환경 변수), 첫 요청 순서(`/login`, `/auth/continue`, 워크스페이스), 탭을 연 채 재시작(18회), 서버가 꺼진 동안 파일 수정(5회), 로그인한 상태로 사용
- **확인된 단서**: 2026-10-21에는 사용자 서버가 브라우저 접속 전에는 정상이었고, 사용자의 일반 Chrome 탭이 처음 접속한 직후 고장 상태가 됐다. 시크릿 창에서는 정상이었다.
- **다음에 발생하면**: 서버를 재시작하기 전에, 그 브라우저의 개발자 도구 Network → `hmr` → Messages 맨 위에서 브라우저가 보낸 `turbopack-subscribe` 목록을 캡처하고 `chrome://extensions` 목록을 확인한다(확장 프로그램 의심).
- **참고**: Next 16.4.0 사용 중. 16.4.2에 Turbopack 상태 관련 수정이 있으나 이 증상과 맞는 항목은 확인하지 못했다.
