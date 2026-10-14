// supabase/tests/*.test.sql(pgTAP)을 Docker 없이 연결된 원격 DB에서 실행한다.
// `supabase test db --linked`는 pg_prove 컨테이너가 필요해서, 대신 `supabase db query --linked`로 실행한다.
// 각 테스트 결과를 임시 테이블에 모은 뒤 일부러 예외를 던져 결과를 받고, 트랜잭션 전체를 롤백한다.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_DIR = "supabase/tests";
const MARKER = "TAP_RESULTS";

function toRunnable(sql) {
  const end = "select * from finish();\nrollback;\n";
  if (!sql.endsWith(end))
    throw new Error(`테스트 파일은 다음으로 끝나야 합니다:\n${end}`);
  return (
    sql
      .slice(0, -end.length)
      .replace(
        /^(select plan\(\d+\);)$/m,
        "$1\ncreate temp table _tap (n serial, line text);\ngrant all on _tap, _tap_n_seq to authenticated;",
      )
      .replace(/^select (\w+)\(/gm, (match, fn) =>
        ["plan", "set_config"].includes(fn) || fn.startsWith("pg_temp")
          ? match
          : `insert into _tap (line) select ${fn}(`,
      ) +
    `insert into _tap (line) select * from finish();
reset role;
do $$ begin
  raise exception E'${MARKER}\\n%', (select string_agg(line, E'\\n' order by n) from _tap);
end $$;
`
  );
}

let failed = false;
const workDir = mkdtempSync(join(tmpdir(), "taskflow-db-test-"));

for (const file of readdirSync(TEST_DIR).filter((f) =>
  f.endsWith(".test.sql"),
)) {
  const runnable = join(workDir, file);
  writeFileSync(
    runnable,
    toRunnable(readFileSync(join(TEST_DIR, file), "utf8")),
  );

  let output;
  try {
    output = execFileSync(
      "npx",
      ["supabase", "db", "query", "--linked", "-f", runnable],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }

  // 결과는 JSON 한 줄이고, 그 안의 에러 메시지("unexpected status 400: {...}")에 TAP 결과가 들어 있다.
  const json = output.split("\n").find((line) => line.startsWith('{"_tag"'));
  const errorMessage = json ? JSON.parse(json).error.message : output;
  const message = errorMessage.includes("{")
    ? JSON.parse(errorMessage.slice(errorMessage.indexOf("{"))).message
    : errorMessage;
  const start = message.indexOf(MARKER);
  if (start === -1) {
    console.error(`✗ ${file}: 테스트 실행 실패\n${message}`);
    failed = true;
    continue;
  }

  const lines = message
    .slice(start + MARKER.length)
    .split("\nCONTEXT:")[0]
    .trim();
  console.log(`# ${file}\n${lines}\n`);
  if (/^not ok/m.test(lines) || /^# Looks like/m.test(lines)) failed = true;
}

process.exit(failed ? 1 : 0);
