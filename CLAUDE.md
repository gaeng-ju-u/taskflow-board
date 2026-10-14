@AGENTS.md

# TaskFlow Board

팀용 이슈 트래커(Jira/Linear 스타일)이며 프론트엔드 포트폴리오 프로젝트다. 계획, 데이터 모델, 진행 상황은 `docs/PLAN.md`를 참고한다. 체크리스트 항목을 끝내면 거기에 체크한다.

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

- `components/ui/`: shadcn 컴포넌트. `npx shadcn@latest add <name>`으로 추가하고, 생성된 파일은 필요할 때만 수정
- `components/<도메인>/`: 도메인 컴포넌트 (예: `components/issues/`, `components/board/`)
- `lib/supabase/server.ts`, `lib/supabase/client.ts`: Supabase 클라이언트는 여기서만 생성
- `lib/queries/`: TanStack Query 키와 쿼리·뮤테이션 훅
- `hooks/`: 범용 클라이언트 훅 (예: `use-theme.ts`)
- `supabase/migrations/`: SQL 마이그레이션. `npx supabase migration new <name> </dev/null`로 파일을 만든다 (stdin을 막지 않으면 입력을 기다리며 멈춤)
- `supabase/tests/`: RLS와 트리거 pgTAP 테스트. 파일은 `select * from finish();` + `rollback;`으로 끝나야 한다

## 코드 규칙

- 서버 데이터는 TanStack Query로 다룬다. 컴포넌트에서 Supabase를 직접 호출하지 않는다.
- 뮤테이션은 낙관적 업데이트로 처리하고, 실패하면 롤백하고 토스트로 알린다.
- 권한은 RLS로 보장한다. 클라이언트의 권한 검사는 UX용일 뿐이다.
- 필터, 정렬, 그룹 상태는 URL search params에 둔다.
- `'use client'`는 상호작용이 필요한 말단 컴포넌트에만 붙인다.
- 인증 라우팅 가드는 `proxy.ts`에서 한다 (middleware 아님).
- 색은 토큰 클래스(`bg-background`, `text-muted-foreground` 등)로만 쓴다. `bg-white`, `text-gray-900` 같은 고정 색은 다크모드를 깨뜨린다.
- 테마는 `lib/theme.ts`의 인라인 스크립트와 `hooks/use-theme.ts`로 처리한다 (next-themes 미사용). 클래스 병합은 `cn` 패키지의 `cn()`을 쓴다.
- shadcn 컴포넌트를 다른 요소로 렌더할 때는 `asChild`가 아니라 Base UI의 `render` prop을 쓴다.
- 입력 검증은 Zod 스키마로 하고, 폼과 뮤테이션에서 같은 스키마를 공유한다.
- 이미 적용된 마이그레이션은 수정하지 않고 새 마이그레이션을 추가한다. 스키마나 정책을 바꾸면 `supabase/tests/`도 갱신한다.
- RLS 헬퍼 함수는 API에 노출되지 않는 `private` 스키마에 둔다. `security definer` 함수는 `set search_path = ''`로 만들고 이름을 스키마로 한정한다.
- 환경 변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key 아님). `.env.local`의 값은 출력하지 않는다.
- 금지: `any`, 클라이언트 코드에서 secret(service role) key 사용, 마이그레이션 없는 스키마 변경.

## 네이밍

- 파일과 폴더: kebab-case (`issue-card.tsx`)
- 컴포넌트와 타입: PascalCase, 훅: `use-*.ts` 파일에 `useXxx`

## Git

- 커밋 메시지와 PR 설명은 한국어로 쓴다. 접두사만 영어로 쓴다 (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).
- 예: `feat: Supabase 스키마, RLS 정책, DB 테스트 추가`
- 기능마다 브랜치를 만들고 PR로 main에 합친다. push는 사용자가 직접 한다.

## 작업 마무리 전

`npm run lint`와 `npm run build`가 통과해야 한다. 포맷팅은 Prettier가 처리한다.
