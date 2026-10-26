import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "cn";

// 설명과 코멘트의 마크다운 렌더러. remark-gfm으로 표, 체크리스트, 취소선, 자동 링크를 지원한다.
// react-markdown은 본문의 HTML을 실행하지 않으므로 사용자가 입력한 내용을 그대로 넘겨도 안전하다.
// 색은 다크모드 규칙에 맞춰 토큰 클래스만 쓴다 (Typography 플러그인의 고정 색 대신).
// react-markdown이 넘기는 node(구문 트리)는 DOM 속성이 아니라서 빼고, 마크다운이 붙인 className
// (체크리스트의 task-list-item, 코드 블록의 language-* 등)은 덮어쓰지 않고 기본 클래스와 합친다.
function domProps<T extends { node?: unknown; className?: string }>(
  { node, className, ...props }: T,
  base: string,
) {
  void node;
  return { ...props, className: cn(base, className) };
}

const components: Components = {
  h1: (props) => (
    <h1 {...domProps(props, "mt-5 text-xl font-semibold first:mt-0")} />
  ),
  h2: (props) => (
    <h2 {...domProps(props, "mt-4 text-lg font-semibold first:mt-0")} />
  ),
  h3: (props) => <h3 {...domProps(props, "mt-3 font-semibold first:mt-0")} />,
  p: (props) => <p {...domProps(props, "mt-2 leading-relaxed first:mt-0")} />,
  ul: (props) => (
    <ul
      {...domProps(
        props,
        cn(
          "mt-2 list-disc pl-5 first:mt-0",
          // 체크리스트(- [ ] 항목)는 글머리 기호 대신 체크박스를 보여준다.
          props.className?.includes("contains-task-list") && "list-none pl-1",
        ),
      )}
    />
  ),
  ol: (props) => (
    <ol {...domProps(props, "mt-2 list-decimal pl-5 first:mt-0")} />
  ),
  li: (props) => <li {...domProps(props, "mt-1")} />,
  input: (props) => (
    <input {...domProps(props, "mr-1.5 align-middle accent-primary")} />
  ),
  a: ({ href, ...props }) => (
    <a
      href={href}
      // 외부 링크는 새 탭에서 열고, 열린 페이지가 이 창에 접근하지 못하게 한다.
      {...(href?.startsWith("http")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      {...domProps(props, "text-primary underline underline-offset-2")}
    />
  ),
  blockquote: (props) => (
    <blockquote
      {...domProps(
        props,
        "mt-2 border-l-2 pl-3 text-muted-foreground first:mt-0",
      )}
    />
  ),
  code: (props) => (
    <code
      {...domProps(
        props,
        "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]",
      )}
    />
  ),
  pre: (props) => (
    // 코드 블록 안의 code에는 인라인 코드 배경을 다시 입히지 않는다.
    <pre
      {...domProps(
        props,
        "mt-2 overflow-x-auto rounded-md bg-muted p-3 text-sm first:mt-0 [&_code]:bg-transparent [&_code]:p-0",
      )}
    />
  ),
  table: (props) => (
    <div className="mt-2 overflow-x-auto first:mt-0">
      <table {...domProps(props, "w-full border-collapse text-sm")} />
    </div>
  ),
  th: (props) => (
    <th {...domProps(props, "border px-2 py-1 text-left font-medium")} />
  ),
  td: (props) => <td {...domProps(props, "border px-2 py-1")} />,
  hr: (props) => <hr {...domProps(props, "my-4 border-border")} />,
  img: ({ alt, ...props }) => (
    // 사용자가 넣은 외부 이미지라 next/image 최적화 대상이 아니다.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...domProps(props, "mt-2 max-w-full rounded-md")} />
  ),
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
