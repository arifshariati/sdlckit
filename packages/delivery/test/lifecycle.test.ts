import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../src/cli.js";

/** The team pack's assets: the same templates and routing.json the installed plugin ships. */
const HOME = resolve(__dirname, "../../../content/team/assets");

interface Result {
  code: number;
  out: string;
}

function cli(cwd: string, ...argv: string[]): Result {
  const lines: string[] = [];
  const sink = (line: string) => lines.push(line);
  try {
    return { code: run(argv, cwd, sink, sink, HOME), out: lines.join("\n") };
  } catch (cause) {
    const code = (cause as { code?: number }).code ?? 99;
    return {
      code: typeof code === "number" ? code : 99,
      out: `${lines.join("\n")}\n${String(cause)}`,
    };
  }
}

/** Expects success (`ok`) or a refusal (`nok`), naming the command in the failure message. */
function ok(cwd: string, ...argv: string[]): string {
  const r = cli(cwd, ...argv);
  expect(r.code, `expected success: ${argv.join(" ")}\n${r.out}`).toBe(0);
  return r.out;
}
function nok(cwd: string, ...argv: string[]): string {
  const r = cli(cwd, ...argv);
  expect(r.code, `expected refusal: ${argv.join(" ")}\n${r.out}`).not.toBe(0);
  return r.out;
}
function path(cwd: string, ...argv: string[]): string {
  return (
    ok(cwd, "path", ...argv)
      .trim()
      .split("\n")
      .pop() ?? ""
  );
}

/** Replaces the first occurrence of `from` in `file`, failing loudly if it is absent. */
function edit(file: string, from: string, to: string): void {
  const text = readFileSync(file, "utf8");
  expect(
    text.includes(from),
    `pattern not found in ${file}: ${JSON.stringify(from)}`,
  ).toBe(true);
  writeFileSync(file, text.replace(from, to));
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function repo(manifest: object): string {
  const dir = mkdtempSync(join(tmpdir(), "sdlckit-delivery-"));
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "user.name", "test");
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(
    join(dir, ".claude", "engineering.json"),
    JSON.stringify(manifest),
  );
  return dir;
}

describe("ticket and epic lifecycle", () => {
  let root: string;

  beforeAll(() => {
    root = repo({
      version: 1,
      project: "selftest",
      packageManager: "npm",
      domains: { "react-web": { present: true }, nestjs: { present: true } },
      gates: { lint: "test -f src/app.txt", test: "! grep -q BUG src/app.txt" },
      delivery: {
        enabled: true,
        gates: ["lint", "test"],
        maxParallelEngineers: 1,
      },
    });
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "app.txt"), "hi\n");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "init");
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("refuses an epic without WHY and AC, and moves through intake only via the gate", () => {
    ok(root, "init");
    ok(root, "new", "epic", "--title", "Checkout flow");
    const epic = path(root, "E-001", "epic");
    nok(root, "transition", "E-001", "proposed");
    edit(
      epic,
      "## Problem / WHY\n",
      "## Problem / WHY\nUsers abandon carts.\n",
    );
    edit(epic, "- AC1:", "- AC1: user can pay\n- AC2: user sees receipt");
    ok(root, "transition", "E-001", "proposed");
    nok(root, "transition", "E-001", "approved");
    nok(root, "gate", "E-001", "plan");
    ok(root, "gate", "E-001", "intake");
    ok(root, "cut", "E-001");
    expect(readdirSync(join(root, ".delivery", "epics"))).toEqual([]);
  });

  it("enforces the Definition of Ready, AC tracing and contract drift before planning", () => {
    ok(
      root,
      "new",
      "ticket",
      "--epic",
      "E-001",
      "--title",
      "Cart API",
      "--domain",
      "nestjs",
      "--traces",
      "AC1",
    );
    ok(
      root,
      "new",
      "ticket",
      "--epic",
      "E-001",
      "--title",
      "Checkout UI",
      "--domain",
      "react-web",
      "--ui",
      "true",
      "--depends",
      "T-001",
      "--traces",
      "AC2",
    );
    ok(
      root,
      "new",
      "ticket",
      "--epic",
      "E-001",
      "--title",
      "Bad",
      "--domain",
      "aws",
    );
    nok(root, "dor", "T-003");
    ok(root, "transition", "T-003", "cancelled", "--reason", "test");
    nok(root, "transition", "E-001", "planned");
    for (const id of ["T-001", "T-002"]) {
      const file = path(root, id);
      edit(
        file,
        "- [ ] TAC1:",
        "- [ ] TAC1: works\n- [ ] TAC2: errors handled",
      );
      edit(
        file,
        "## Technical approach\n",
        "## Technical approach\nsrc/app.txt\n",
      );
    }
    edit(
      path(root, "E-001", "epic"),
      "## Architecture\n",
      "## Architecture\n- POST /cart/items returns 404 `{ code: 'PRODUCT_NOT_FOUND' }`\n",
    );
    nok(root, "transition", "E-001", "planned");
    edit(
      path(root, "T-001"),
      "## Technical approach\n",
      "## Technical approach\nPOST /cart/items (unknown id → 404 `{ code: 'PRODUCT_NOT_FOUND' }`)\n",
    );
    ok(root, "drift", "E-001");
    ok(root, "transition", "E-001", "planned");
    ok(root, "gate", "E-001", "plan");
  });

  it("runs a ticket through red gates, review, QA failure, escalation, rework, docs, merge and done", () => {
    ok(root, "transition", "T-001", "ready");
    nok(root, "transition", "T-001", "in-progress");
    appendFileSync(
      path(root, "T-001", "qa-plan"),
      "\n| TAC1 | a | api | - | ok | t1 |\n| TAC2 | b | api | - | ok | t2 |\n",
    );
    const wt = ok(root, "worktree", "T-001").trim();
    ok(root, "transition", "T-001", "in-progress");
    writeFileSync(join(wt, "src", "app.txt"), "BUG\n");
    git(wt, "commit", "-qam", "feat");
    nok(root, "gates", "T-001");
    nok(root, "transition", "T-001", "in-qa");
    writeFileSync(join(wt, "src", "app.txt"), "ok\n");
    git(wt, "commit", "-qam", "fix");
    ok(root, "gates", "T-001");
    ok(root, "review", "T-001", "--blockers", "0", "--majors", "1");
    nok(root, "transition", "T-001", "in-qa");
    ok(root, "review", "T-001", "--blockers", "0", "--majors", "0");
    ok(root, "transition", "T-001", "in-qa");

    mkdirSync(join(wt, "qa"));
    writeFileSync(join(wt, "qa", "accept.spec.ts"), "test('TAC2')\n");
    git(wt, "add", "-A");
    git(wt, "commit", "-qm", "test(qa): acceptance");
    ok(root, "qa-lock", "T-001", "--files", "qa/accept.spec.ts");
    ok(root, "gates", "T-001");
    let report = ok(root, "qa-round", "T-001").trim();
    edit(report, "TAC1: TBD", "TAC1: PASS");
    edit(report, "TAC2: TBD", "TAC2: FAIL");
    edit(report, "VERDICT: TBD", "VERDICT: FAIL");
    nok(root, "transition", "T-001", "qa-passed");
    ok(root, "transition", "T-001", "rework");

    appendFileSync(join(wt, "src", "app.txt"), "more\n");
    writeFileSync(join(wt, "qa", "accept.spec.ts"), "test.skip('TAC2')\n");
    git(wt, "commit", "-qam", "rework (+ weakens QA test)");
    ok(root, "gates", "T-001");
    ok(root, "review", "T-001", "--blockers", "0", "--majors", "0");
    expect(nok(root, "transition", "T-001", "in-qa")).toContain(
      "only qa-specialist may change it",
    );
    writeFileSync(join(wt, "qa", "accept.spec.ts"), "test('TAC2')\n");
    git(wt, "commit", "-qam", "restore QA test");
    nok(root, "transition", "T-001", "in-qa");
    ok(root, "gates", "T-001");
    ok(root, "review", "T-001", "--blockers", "0", "--majors", "0");
    ok(root, "transition", "T-001", "in-qa");
    expect(
      ok(root, "model", "sdlckit-team:backend-engineer", "T-001"),
    ).toContain('"model":"opus"');

    report = ok(root, "qa-round", "T-001").trim();
    edit(report, "TAC1: TBD", "TAC1: PASS");
    edit(report, "TAC2: TBD", "TAC2: PASS");
    edit(report, "VERDICT: TBD", "VERDICT: PASS");
    ok(root, "transition", "T-001", "qa-passed");
    writeFileSync(join(wt, "README.md"), "# docs\n");
    git(wt, "add", "-A");
    git(wt, "commit", "-qm", "docs");
    nok(root, "dod", "T-001");
    const ticket = path(root, "T-001");
    edit(ticket, "- [ ] TAC1: works", "- [x] TAC1: works (evidence: t1)");
    edit(
      ticket,
      "- [ ] TAC2: errors handled",
      "- [x] TAC2: errors handled (evidence: t2)",
    );
    edit(ticket, "## Docs\n", "## Docs\nREADME.md\n");
    ok(root, "changelog", "T-001", "cart API");
    nok(root, "transition", "T-001", "done");
    ok(root, "merge", "T-001");
    ok(root, "dod", "T-001");
    ok(root, "transition", "T-001", "done");
  });

  it("gates design approval, refuses stale QA verdicts and record tampering, and never commits evidence", () => {
    ok(root, "transition", "T-002", "in-design");
    path(root, "T-002", "design");
    const review = path(root, "T-002", "design-review");
    writeFileSync(
      review,
      readFileSync(review, "utf8").replaceAll(
        "VERDICT: pending",
        "VERDICT: approved",
      ),
    );
    nok(root, "transition", "T-002", "design-approved");
    edit(
      path(root, "T-002", "design"),
      "|---|---|---|---|\n",
      "|---|---|---|---|\n| Summary | Card | default | - |\n",
    );
    ok(root, "transition", "T-002", "design-approved");
    ok(root, "transition", "T-002", "ready");
    appendFileSync(
      path(root, "T-002", "qa-plan"),
      "\n| TAC1 | a | e2e | - | ok | t |\n| TAC2 | b | e2e | - | ok | t |\n",
    );
    const wt = ok(root, "worktree", "T-002").trim();
    ok(root, "transition", "T-002", "in-progress");
    appendFileSync(join(wt, "src", "app.txt"), "ui\n");
    git(wt, "commit", "-qam", "ui");
    ok(root, "gates", "T-002");
    ok(root, "review", "T-002", "--blockers", "0", "--majors", "0");
    ok(root, "transition", "T-002", "in-qa");
    const report = ok(root, "qa-round", "T-002").trim();
    writeFileSync(
      report,
      readFileSync(report, "utf8").replace(/: TBD.*$/gm, ": PASS"),
    );

    appendFileSync(join(wt, "src", "app.txt"), "sneaky\n");
    git(wt, "commit", "-qam", "post-QA code change");
    ok(root, "gates", "T-002");
    ok(root, "review", "T-002", "--blockers", "0", "--majors", "0");
    expect(nok(root, "transition", "T-002", "qa-passed")).toContain(
      "QA must re-test",
    );
    git(wt, "reset", "-q", "--hard", "HEAD~1");
    ok(root, "gates", "T-002");
    ok(root, "review", "T-002", "--blockers", "0", "--majors", "0");
    ok(root, "transition", "T-002", "qa-passed");

    const epicFile = readdirSync(join(wt, ".delivery", "epics"))[0] ?? "";
    appendFileSync(join(wt, ".delivery", "epics", epicFile), "x\n");
    git(wt, "commit", "-qam", "tamper");
    expect(nok(root, "merge", "T-002")).toContain("engineers must not edit");
    git(wt, "reset", "-q", "--hard", "HEAD~1");

    const ticket = path(root, "T-002");
    edit(ticket, "- [ ] TAC1: works", "- [x] TAC1: works (evidence: s1.png)");
    edit(
      ticket,
      "- [ ] TAC2: errors handled",
      "- [x] TAC2: errors handled (evidence: s2.png)",
    );
    edit(ticket, "## Docs\n", "## Docs\nNo docs impact: UI only\n");
    ok(root, "changelog", "T-002", "checkout UI");
    const epic = readFileSync(path(root, "E-001", "epic"), "utf8");
    expect(epic).toMatch(/^- T-001: cart API$/m);
    expect(epic).toMatch(/^- T-002: checkout UI$/m);

    const epicWt = path(root, "E-001", "worktree");
    mkdirSync(join(epicWt, ".delivery", "qa", "T-002", "evidence"), {
      recursive: true,
    });
    writeFileSync(
      join(epicWt, ".delivery", "qa", "T-002", "evidence", "shot.png"),
      "png",
    );
    ok(root, "merge", "T-002");
    ok(root, "transition", "T-002", "done");
    expect(git(epicWt, "ls-files", "*evidence*")).toBe("");
  });

  it("closes the epic only with a report, and leaves every record committed", () => {
    nok(root, "transition", "E-001", "in-acceptance");
    edit(
      path(root, "E-001", "report"),
      "## What was delivered\n",
      "## What was delivered\nAC1 via T-001, AC2 via T-002\n",
    );
    ok(root, "transition", "E-001", "in-acceptance");
    ok(root, "gate", "E-001", "acceptance");
    expect(ok(root, "board")).toContain("E-001 · Checkout flow  `done`");
    const epicWt = join(root, ".delivery", ".worktrees", "E-001");
    expect(
      git(
        epicWt,
        "status",
        "--porcelain",
        "--",
        ".",
        ":(exclude).delivery/qa/*/evidence/**",
      ),
    ).toBe("");
  });
});

describe("repo docs mapping", () => {
  let root: string;

  beforeAll(() => {
    root = repo({
      version: 1,
      project: "docs",
      packageManager: "npm",
      domains: { "react-web": { present: true } },
      gates: { lint: "true" },
      delivery: {
        enabled: true,
        gates: ["lint"],
        docs: { adrDir: "docs/adr", statusFile: "docs/STATUS.md" },
      },
    });
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(
      join(root, "docs", "STATUS.md"),
      '# Status\n\n## At a glance\n\n```mermaid\npie showData\n    title Items\n    "Done" : 1\n    "To do" : 1\n```\n\n| ID | Task | Status | Next action |\n|----|------|--------|-------------|\n| OLD-01 | Legacy thing | ✅ done | none |\n| UI-04 | Live region | 📥 todo | medium |\n\n## Decisions\nkeep me\n',
    );
    writeFileSync(
      join(root, "docs", "adr", "0001-first.md"),
      "# ADR 0001: First\n\n- **Status:** accepted\n",
    );
    git(root, "add", "-A");
    git(root, "commit", "-qm", "init");
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("renders the status table and pie from records, keeping legacy rows and other sections", () => {
    ok(root, "init");
    ok(root, "new", "epic", "--title", "Announce changes");
    ok(root, "set", "E-001", "ref=UI-04");
    ok(root, "new", "epic", "--title", "Brand new work");
    ok(root, "status-md");
    const status = readFileSync(join(root, "docs", "STATUS.md"), "utf8");
    expect(status).toContain(
      "| UI-04 | Live region | 📥 todo | E-001: draft, /po intake |",
    );
    expect(status).toMatch(/^\| E-002 \| Brand new work \| 📥 todo \|/m);
    expect(status).toContain("| OLD-01 | Legacy thing | ✅ done | none |");
    expect(status).toContain('"To do" : 2');
    expect(status).toMatch(/^keep me$/m);
  });

  it("writes ADRs in the repo's style and numbering, and renders status inside the epic worktree", () => {
    const epic = path(root, "E-001", "epic");
    edit(epic, "## Problem / WHY\n", "## Problem / WHY\nSilent changes.\n");
    edit(epic, "- AC1:", "- AC1: changes are announced");
    ok(root, "transition", "E-001", "proposed");
    ok(root, "gate", "E-001", "intake");
    ok(root, "cut", "E-001");
    expect(
      ok(
        root,
        "new",
        "adr",
        "--epic",
        "E-001",
        "--title",
        "Use one live region",
      ),
    ).toContain('"id":"ADR-0002"');
    const adr = join(
      path(root, "E-001", "worktree"),
      "docs",
      "adr",
      "0002-use-one-live-region.md",
    );
    expect(existsSync(adr)).toBe(true);
    ok(root, "set", "ADR-0002", "status=accepted");
    expect(readFileSync(adr, "utf8")).toMatch(/^- \*\*Status:\*\* accepted/m);
    ok(root, "status-md", "--in", "E-001");
    expect(
      readFileSync(
        join(path(root, "E-001", "worktree"), "docs", "STATUS.md"),
        "utf8",
      ),
    ).toContain("| UI-04 | Live region | 📥 todo | E-001: /refine |");
  });
});

describe("contract-check", () => {
  it("rejects drifted replies and accepts compliant ones", () => {
    const dir = mkdtempSync(join(tmpdir(), "sdlckit-contract-"));
    const bad = join(dir, "bad.md");
    writeFileSync(
      bad,
      "```yaml\nrole: product-owner\nmode: m\nminors: []\n```\n",
    );
    const good = join(dir, "good.md");
    writeFileSync(
      good,
      "```yaml\nagent: a\nmode: m\nsubject: E-1\nstatus: done\nsummary: s\nartifacts: []\nitems:\n  - id: 1\n    severity: major\n    text: t\nquestions_for_user: []\nnext: n\nrulebooks_read: [delivery-po]\nevidence: verified\n```\n",
    );
    expect(
      nok(dir, "contract-check", bad, "--rulebooks", "delivery-po"),
    ).toContain("non-contract key 'role'");
    expect(
      ok(dir, "contract-check", good, "--rulebooks", "delivery-po"),
    ).toContain("CONTRACT PASS");
    expect(nok(dir, "contract-check")).toContain("usage");
    rmSync(dir, { recursive: true, force: true });
  });
});
