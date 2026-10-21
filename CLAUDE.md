@AGENTS.md

# TaskFlow Board

팀용 이슈 트래커(Jira/Linear 스타일)이며 프론트엔드 포트폴리오 프로젝트다. 계획, 데이터 모델, 진행 상황은 `docs/PLAN.md`를 참고한다. 체크리스트 항목을 끝내면 거기에 체크한다.

## 작업 방식

- 사용자와는 한국어로 소통한다. 무엇을 할지와 왜 그렇게 하는지를 함께 설명하면서 진행한다.
- 사용자가 "대기", "질문만" 등으로 멈추라고 하면 다음 단계를 진행하지 않고 답만 한다.
- 구현 후 순서: lint·build 통과 → 가능하면 직접 동작 확인 → 사용자에게 번호 붙인 테스트 목록 전달 → 사용자 확인 후 커밋. 확인하지 못한 부분은 확인하지 못했다고 밝힌다.
- 직접 동작 확인 방법: 로그인이 필요한 화면은 scratchpad에 프로젝트를 복사(`node_modules`는 `cp -cR`)하고 `lib/data/*`, `proxy.ts`를 가짜 데이터로 바꿔 다른 포트로 띄운 뒤, 헤드리스 Chrome(puppeteer-core + 설치된 Chrome, 임시 프로필)으로 콘솔 에러와 동작을 확인한다. 실제 프로젝트 파일은 바꾸지 않는다.
- 원인을 설명할 때 추측과 확인된 사실을 구분한다. 가능하면 재현하거나 로그·응답 헤더·라이브러리 동작으로 확인한 뒤 고친다. 추측으로 고쳤다면 그렇게 밝힌다.
- 사용자가 직접 하는 일: `git push`, PR 머지, `npx supabase db push`, Vercel·Supabase·GitHub 대시보드 설정. Supabase DB에 테스트 데이터를 쓰는 작업은 먼저 허락을 받고, 끝나면 지운다.

## 스택

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui (Base UI 기반, Radix 아님), TanStack Query, dnd-kit, React Hook Form + Zod, Supabase (Auth/Postgres/RLS/Realtime), Vercel 배포.

## 명령어

- `npm run dev`: 개발 서버
- `npm run build`: 프로덕션 빌드 (타입 검사 포함)
- `npm run lint`: ESLint
- `npm run format`: Prettier로 전체 포맷팅
- `npm run db:types`: DB 타입 생성 (`lib/supabase/database.types.ts`, 직접 수정 금지)
- `npm run test:db`: `supabase/tests/*.test.sql`(pgTAP)을 원격 DB에서 실행. 트랜잭션을 롤백하므로 데이터가 남지 않는다 (Docker 불필요)
- `npx supabase db push`: 마이그레이션 적용. **사용자가 직접 실행한다** (확인 프롬프트가 있고, 원격 DB를 변경함). `--dry-run`은 실행해도 된다

## 폴더 구조

- `components/ui/`: shadcn 컴포넌트. `printf 'n\n' | npx shadcn@latest add <name>`으로 추가한다 (기존 파일 덮어쓰기 질문에서 멈추지 않게). 생성된 파일은 필요할 때만 수정. 토스트는 `components/ui/toaster.tsx`(sonner + useTheme)를 쓰고 shadcn sonner는 쓰지 않는다 (next-themes 의존)
- `components/<도메인>/`: 도메인 컴포넌트 (예: `components/issues/`, `components/board/`)
- `lib/supabase/server.ts`, `lib/supabase/client.ts`: Supabase 클라이언트는 여기서만 생성
- `lib/data/`: Server Component용 데이터 함수 (`import "server-only"`, React `cache`로 요청 내 중복 제거). 예: `getCurrentUser`, `getWorkspaceBySlug`
- `lib/api/`: 서버와 클라이언트가 함께 쓰는 조회 함수와 타입 (어느 Supabase 클라이언트든 받음). 예: `listProjects`, `Project`
- `lib/queries/`: TanStack Query 훅. 키는 `keys.ts`의 `queryKeys`로만 만든다 (워크스페이스 단위로 묶음)
- `lib/validations/`: Zod 스키마 (폼과 Server Action이 공유)
- `hooks/`: 범용 클라이언트 훅 (예: `use-theme.ts`)
- `supabase/migrations/`: SQL 마이그레이션. `npx supabase migration new <name> </dev/null`로 파일을 만든다 (stdin을 막지 않으면 입력을 기다리며 멈춤)
- `supabase/tests/`: RLS와 트리거 pgTAP 테스트. 파일은 `select * from finish();` + `rollback;`으로 끝나야 한다

## 코드 규칙

- 컴포넌트에서 Supabase를 직접 호출하지 않는다. Server Component는 `lib/data/` 함수로 읽고, 클라이언트의 서버 데이터는 TanStack Query로 다룬다. 폼 제출(로그인, 생성)은 Server Action + `useActionState`로 처리한다.
- `cacheComponents`가 켜져 있다. 쿠키·세션·DB를 읽는 Server Component는 `<Suspense>` 안에 두고, layout·page 최상단에서 await하지 않는다 (`params`는 Promise 그대로 자식에 넘긴다). `useSearchParams`를 쓰는 클라이언트 컴포넌트도 가능한 작게 분리해 Suspense로 감싼다.
- 세션 확인은 `supabase.auth.getClaims()`를 쓴다 (`getSession()`은 서명을 검증하지 않음). 로그인 후 이동 경로는 `safeNextPath()`로 검사해 open redirect를 막는다.
- 뮤테이션은 낙관적 업데이트로 처리한다: `onMutate`에서 `applyOptimistic`, `onError`에서 `rollbackOptimistic`(롤백 + 토스트), `onSettled`에서 `invalidateQueries`. 생성할 때는 id를 클라이언트에서 `crypto.randomUUID()`로 만들어 낙관적 항목과 서버 결과의 id를 맞춘다.
- `mutate(vars, { onSuccess })`처럼 호출할 때 넘긴 콜백은 그 컴포넌트가 언마운트되면 실행되지 않는다. 낙관적 업데이트로 화면 구조가 바뀌면(빈 상태 → 목록) 호출한 컴포넌트가 사라질 수 있으므로, 호출하는 컴포넌트를 같은 자리에 유지하거나 훅 옵션의 콜백을 쓴다.
- 뮤테이션 뒤의 화면 이동(삭제 후 목록으로 등)은 성공한 뒤에만 한다 (`useDeleteIssue(ws, { onDeleted })` 같은 훅 옵션). 요청과 동시에 이동하면 오프라인에서 이동 요청이 실패해 브라우저 오류 화면(공룡)으로 넘어간다.
- 오프라인 처리: 브라우저가 오프라인(`navigator.onLine === false`)이면 `applyOptimistic`이 화면을 바꾸지 않고 `OfflineError`를 던져 요청 없이 끝낸다("오프라인" 알림). 온라인인데 서버가 실패하면 낙관적으로 바꿨다가 롤백하고 알린다. 뮤테이션은 `networkMode: "always"`(QueryProvider 기본값)라 일시정지하지 않는다. 에러 타입은 `MutationError`, 에러 코드 확인은 `hasErrorCode()`를 쓴다.
- 서버 컴포넌트가 읽은 데이터는 클라이언트 컴포넌트의 `useQuery`에 `initialData`로 넘겨 첫 화면부터 보여준다. 같은 데이터를 보는 컴포넌트는 같은 쿼리 키를 써서 캐시를 공유한다.
- `lib/supabase/server.ts`의 `createClient()`는 `await connection()`을 먼저 호출한다. Partial Prefetching이 쿠키 기반 내용까지 미리 렌더하는데, Supabase(토큰 만료 확인)와 TanStack Query가 렌더 중 `Date.now()`를 써서 에러가 나기 때문이다. 이 줄을 지우지 않는다.
- 개발 서버 에러는 `.next/dev/logs/next-development.log`에서 확인할 수 있다.
- 권한은 RLS로 보장한다. 클라이언트의 권한 검사는 UX용일 뿐이다.
- 필터, 정렬, 그룹 상태는 URL search params에 둔다.
- `'use client'`는 상호작용이 필요한 말단 컴포넌트에만 붙인다.
- 인증 라우팅 가드는 `proxy.ts`에서 한다 (middleware 아님).
- 색은 토큰 클래스(`bg-background`, `text-muted-foreground` 등)로만 쓴다. `bg-white`, `text-gray-900` 같은 고정 색은 다크모드를 깨뜨린다.
- 테마는 `lib/theme.ts`의 인라인 스크립트와 `hooks/use-theme.ts`로 처리한다 (next-themes 미사용). 클래스 병합은 `cn` 패키지의 `cn()`을 쓴다.
- shadcn 컴포넌트를 다른 요소로 렌더할 때는 `asChild`가 아니라 Base UI의 `render` prop을 쓴다.
- 입력 검증은 Zod 스키마로 하고, 폼과 뮤테이션에서 같은 스키마를 공유한다.
- 키보드 처리(Enter 저장, Esc 취소, 단축키)는 `event.nativeEvent.isComposing`이면 무시한다. 한글 조합 중의 Enter에 반응하면 마지막 글자가 한 번 더 입력된다.
- 그 자리에서 편집하는 필드(제목, 설명)는 입력값을 편집 중·저장 중에만 보여주고, 저장이 끝나면(`onSettled`) 버리고 캐시 값을 보여준다 (`components/issues/issue-detail.tsx`의 `useEditableText`). 입력값을 계속 들고 있으면 저장 실패 시 롤백된 값이 화면에 나타나지 않는다.
- 드롭다운 메뉴 너비는 기본값이 트리거 버튼 너비다. 아이콘 버튼에서 여는 메뉴는 `w-auto min-w-40` 등으로 내용 너비를 준다.
- 하나만 고르는 드롭다운(`DropdownMenuRadioItem`)은 `closeOnClick`을 준다. Base UI 기본값은 골라도 닫히지 않음이다.
- 드래그 앤 드롭(dnd-kit, `components/issues/issue-board.tsx`): `DndContext`에 고정 `id`를 준다(hydration 경고 방지). 놓은 뒤의 임시 배치는 저장 요청이 끝날 때까지 유지한다(놓자마자 지우면 카드가 원래 자리로 튄다). 순서는 앞뒤 카드의 중간값(`sortOrderBetween`)으로 옮긴 카드 하나만 수정한다. 키보드는 스페이스바로 집기·놓기, Enter로 열기, ←/→로 칸 이동. 카드 안의 버튼은 `onPointerDown`에서 전파를 막아 드래그 시작을 막고, 카드 단축키는 `event.target === event.currentTarget`일 때만 처리한다(portal 메뉴의 React 이벤트도 카드로 올라온다).
- 이미 적용된 마이그레이션은 수정하지 않고 새 마이그레이션을 추가한다. 스키마나 정책을 바꾸면 `supabase/tests/`도 갱신한다.
- RLS 헬퍼 함수는 API에 노출되지 않는 `private` 스키마에 둔다. `security definer` 함수는 `set search_path = ''`로 만들고 이름을 스키마로 한정한다.
- 환경 변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key 아님). `.env.local`의 값은 출력하지 않는다.
- 금지: `any`, 클라이언트 코드에서 secret(service role) key 사용, 마이그레이션 없는 스키마 변경.

## 네이밍

- 파일과 폴더: kebab-case (`issue-card.tsx`)
- 컴포넌트와 타입: PascalCase, 훅: `use-*.ts` 파일에 `useXxx`

## 배포

- Vercel(https://taskflow-board-tau.vercel.app), `main` 머지 시 자동 배포. 함수 지역은 서울(`icn1`)로 유지한다. 상세는 `docs/PLAN.md`의 "배포".
- 새 환경 변수를 추가하면 Vercel 프로젝트 설정에도 넣고 재배포해야 한다 (`.env.local`은 git에 없다).
- 로그인 리다이렉트 주소를 바꾸면 Supabase Auth의 Redirect URLs에도 등록해야 한다.

## Git

- 커밋 메시지와 PR 설명은 한국어로 쓴다. 접두사만 영어로 쓴다 (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).
- 예: `feat: Supabase 스키마, RLS 정책, DB 테스트 추가`
- PR 설명은 소개하는 말투("~했습니다", "~입니다")를 쓰지 않는다. 명사형·개조식으로 사실만 짧게 전달한다. 예: "이슈 쿼리 키를 프로젝트 키와 분리. 프로젝트 이름 변경 시 이슈 목록 재요청 방지"
- 코드 변경(기능, 버그 수정, 마이그레이션)은 브랜치를 만들고 PR로 main에 합친다. 그 작업 중에 생긴 문서 변경(PLAN.md 체크, 조사 기록, 설정 메모, 규칙 보완)은 같은 작업 브랜치에 함께 커밋한다.
- 진행 중인 작업과 관계없이 문서만 바꿀 때(규칙·기획 수정, README, 오타)는 새 브랜치를 만들지 않고 main에 바로 커밋한다.
- push와 PR 머지는 사용자가 직접 한다. main에 올라가면 Vercel이 자동으로 운영 배포한다.

## 작업 마무리 전

`npm run lint`와 `npm run build`가 통과해야 한다. 포맷팅은 Prettier가 처리한다.
