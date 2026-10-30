import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { formatGates, runGates as runRepoGates } from "@sdlckit/eng";
import { DeliveryError } from "./errors.js";
import {
  appendHistory,
  type Frontmatter,
  list,
  map,
  meaningful,
  num,
  parseScalar,
  type Rec,
  readRec,
  section,
  slug,
  str,
  today,
  type Value,
  writeRec,
} from "./records.js";

export type Opts = Record<string, string | true>;

interface Config {
  dir: string;
  maxParallelEngineers: number;
  qaReworkCap: number;
  baseBranch: string;
  gates: string[];
  worktreeSetup: string | null;
  worktreeCopy: string[];
  engineers: Record<string, string>;
  docs: { adrDir?: string; statusFile?: string };
}

interface Routing {
  model: string;
  effortLevels: string[];
  effort: Record<string, string>;
  engineers: Record<string, string>;
  escalation: {
    engineerQaRound: number;
    engineerRedGateRuns: number;
    engineerEffort: string;
    architectOnEpicRisk: string;
    architectEffortOnEpicRisk: string;
  };
}

interface Tac {
  id: string;
  done: boolean;
  text: string;
}

interface QaRound {
  head: string | null;
  verdict: string | null;
  tac: Record<string, string>;
}

const EPIC_T: Record<string, string[]> = {
  draft: ["proposed"],
  proposed: ["draft"],
  approved: ["planned"],
  planned: ["approved"],
  "in-delivery": ["in-acceptance"],
  "in-acceptance": ["in-delivery"],
};
const TICKET_T: Record<string, string[]> = {
  todo: ["in-design", "ready"],
  "in-design": ["design-approved"],
  "design-approved": ["ready", "in-design"],
  ready: ["in-progress"],
  "in-progress": ["in-qa"],
  "in-qa": ["rework", "qa-passed"],
  rework: ["in-qa"],
  "qa-passed": ["done", "in-qa"],
};
const GATES: Record<string, [string, string]> = {
  intake: ["proposed", "approved"],
  plan: ["planned", "in-delivery"],
  acceptance: ["in-acceptance", "done"],
};
const LOCKED_FIELDS = [
  "id",
  "status",
  "gates",
  "qa_round",
  "red_gate_runs",
  "blocked_from",
  "effort_overrides",
  "model_overrides",
  "epic",
];
const ARTIFACTS: Record<string, string> = {
  design: "design.md",
  "design-review": "review.md",
  "qa-plan": "plan.md",
  "qa-report": "report.md",
  "gates-log": "gates.log",
  review: "review.md",
};
const ARTIFACT_TEMPLATES: Record<string, string> = {
  design: "design.md",
  "design-review": "design-review.md",
  "qa-plan": "qa-plan.md",
  "qa-report": "qa-report.md",
};

/**
 * The delivery state machine for one repo. Every state change goes through here and is refused
 * unless its evidence exists (SPEC: LLMs reason, tools verify). Output goes to `out`; refusals
 * throw `DeliveryError` with the CLI exit code.
 */
export class Delivery {
  readonly root: string;
  private readonly manifestPath: string;
  private configCache: Config | undefined;

  constructor(
    readonly cwd: string,
    /** Folder holding `templates/` and `routing.json`: the plugin root when installed. */
    readonly home: string,
    private readonly out: (line: string) => void = (line) =>
      process.stdout.write(`${line}\n`),
    private readonly err: (line: string) => void = (line) =>
      process.stderr.write(`${line}\n`),
  ) {
    const common = this.git(
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      cwd,
      true,
    );
    if (!common) throw new DeliveryError("not inside a git repository");
    this.root = dirname(common); // main checkout root, even when called from a worktree
    this.manifestPath = join(this.root, ".claude", "engineering.json");
  }

  // ───────────── config and paths ─────────────
  manifest(): Record<string, unknown> {
    if (!existsSync(this.manifestPath)) {
      throw new DeliveryError(
        `no manifest at ${this.manifestPath}. Run /eng-init first.`,
        3,
      );
    }
    return JSON.parse(readFileSync(this.manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
  }

  config(): Config {
    if (this.configCache) return this.configCache;
    const d = (this.manifest().delivery ?? {}) as Partial<Config>;
    this.configCache = {
      dir: d.dir ?? ".delivery",
      maxParallelEngineers: d.maxParallelEngineers ?? 2,
      qaReworkCap: d.qaReworkCap ?? 3,
      baseBranch: d.baseBranch ?? "main",
      gates: d.gates ?? ["format", "lint", "typecheck", "test"],
      worktreeSetup: d.worktreeSetup ?? null,
      worktreeCopy: d.worktreeCopy ?? [],
      engineers: d.engineers ?? {},
      docs: d.docs ?? {},
    };
    return this.configCache;
  }

  private routing(): Routing {
    return JSON.parse(
      readFileSync(join(this.home, "routing.json"), "utf8"),
    ) as Routing;
  }

  private mainDir(): string {
    return join(this.root, this.config().dir);
  }
  private wtRoot(): string {
    return join(this.mainDir(), ".worktrees");
  }
  epicWt(eid: string): string {
    return join(this.wtRoot(), eid);
  }
  ticketWt(tid: string): string {
    return join(this.wtRoot(), tid);
  }

  private git(
    args: string[],
    cwd: string = this.root,
    soft = false,
  ): string | null {
    try {
      return execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    } catch (cause) {
      if (soft) return null;
      const stderr = (cause as { stderr?: string }).stderr ?? String(cause);
      throw new DeliveryError(`git ${args.join(" ")} failed:\n${stderr}`);
    }
  }
  private gitOk(args: string[], cwd: string = this.root): boolean {
    return this.git(args, cwd, true) !== null;
  }

  private template(name: string, vars: Record<string, string>): string {
    let t = readFileSync(join(this.home, "templates", name), "utf8");
    for (const [k, v] of Object.entries(vars)) t = t.split(`{{${k}}}`).join(v);
    return t;
  }

  // ───────────── record discovery ─────────────
  private epicWorktrees(): string[] {
    if (!existsSync(this.wtRoot())) return [];
    return readdirSync(this.wtRoot()).filter((d) => /^E-\d+$/.test(d));
  }

  private recordDirs(): string[] {
    return [
      this.mainDir(),
      ...this.epicWorktrees().map((d) =>
        join(this.epicWt(d), this.config().dir),
      ),
    ].filter((d) => existsSync(d));
  }

  /** One file per id; an epic worktree copy beats a copy committed on the base branch. */
  allRecs(kind: "epics" | "tickets" | "adr"): string[] {
    const byId = new Map<string, string>();
    const marker = `${sep}.worktrees${sep}`;
    for (const d of this.recordDirs()) {
      const k = join(d, kind);
      if (!existsSync(k)) continue;
      for (const f of readdirSync(k)) {
        if (!f.endsWith(".md")) continue;
        const id = f.match(/^((?:E|T|ADR)-\d+)/)?.[1] ?? f;
        const file = join(k, f);
        if (!byId.has(id) || file.includes(marker)) byId.set(id, file);
      }
    }
    return [...byId.values()];
  }

  private adrDirMode(): boolean {
    return Boolean(this.config().docs.adrDir);
  }

  private docAdrs(): Map<string, string> {
    const rel = this.config().docs.adrDir ?? "";
    const dirs = [
      join(this.root, rel),
      ...this.epicWorktrees().map((d) => join(this.epicWt(d), rel)),
    ].filter((d) => existsSync(d));
    const found = new Map<string, string>();
    for (const d of dirs) {
      for (const f of readdirSync(d)) {
        const n = f.match(/^(\d{4})-.+\.md$/)?.[1];
        if (!n) continue;
        const file = join(d, f);
        if (!found.has(`ADR-${n}`) || file.includes(`${sep}.worktrees${sep}`))
          found.set(`ADR-${n}`, file);
      }
    }
    return found;
  }

  findRec(id: string): Rec {
    if (id.startsWith("ADR-") && this.adrDirMode()) {
      const file = this.docAdrs().get(id);
      if (!file) throw new DeliveryError(`record ${id} not found`);
      const body = readFileSync(file, "utf8");
      const status = (
        body.match(/^- \*\*Status:\*\*\s*(\S+)/m)?.[1] ?? "proposed"
      ).replace(/[^a-z-]/gi, "");
      const epic = body.match(/^- \*\*Epic:\*\*\s*(E-\d+)/m)?.[1] ?? null;
      return { file, fm: { id, status, epic }, body, docStyle: true };
    }
    const kind = id.startsWith("E-")
      ? "epics"
      : id.startsWith("T-")
        ? "tickets"
        : id.startsWith("ADR-")
          ? "adr"
          : null;
    if (!kind) throw new DeliveryError(`bad id ${id}`);
    const hits = this.allRecs(kind).filter(
      (f) => basename(f).startsWith(`${id}-`) || basename(f) === `${id}.md`,
    );
    const marker = `${sep}.worktrees${sep}`;
    hits.sort(
      (a, b) => Number(b.includes(marker)) - Number(a.includes(marker)),
    );
    const hit = hits[0];
    if (!hit) throw new DeliveryError(`record ${id} not found`);
    return readRec(hit);
  }

  private recDir(rec: Rec): string {
    return dirname(dirname(rec.file));
  }

  private nextId(prefix: string, kind: "epics" | "tickets" | "adr"): string {
    let max = 0;
    for (const f of this.allRecs(kind)) {
      const m = basename(f).match(new RegExp(`^${prefix}-(\\d+)`));
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `${prefix}-${String(max + 1).padStart(3, "0")}`;
  }

  epicTickets(eid: string): Rec[] {
    return this.allRecs("tickets")
      .map(readRec)
      .filter((r) => r.fm.epic === eid);
  }

  private isCut(eid: string): boolean {
    return existsSync(join(this.epicWt(eid), this.config().dir));
  }

  private epicOf(rec: Rec): string {
    const id = str(rec.fm.id);
    return id.startsWith("E-") ? id : str(rec.fm.epic);
  }

  /** Commits record changes in an epic worktree, only at checkpoints, so the epic PR history stays readable. */
  private commitRecords(eid: string, msg: string, checkpoint = false): void {
    if (!checkpoint || !this.isCut(eid)) return;
    const wt = this.epicWt(eid);
    const dir = this.config().dir;
    // never commit screenshots, even when the .gitignore block isn't on this branch
    this.git(["add", "-A", "--", dir, `:(exclude)${dir}/qa/*/evidence/**`], wt);
    if (this.git(["diff", "--cached", "--name-only"], wt)) {
      this.git(["commit", "-q", "-m", `chore(delivery): ${msg}`], wt);
    }
  }

  // ───────────── checks ─────────────
  tacs(rec: Rec): Tac[] {
    const ac = section(rec.body, "Acceptance criteria") ?? "";
    return [...ac.matchAll(/^- \[( |x|X)\] (TAC\d+):?(.*)$/gm)].map((m) => ({
      id: m[2] ?? "",
      done: m[1] !== " ",
      text: (m[3] ?? "").trim(),
    }));
  }

  dor(t: Rec): string[] {
    const errs: string[] = [];
    const domains = (this.manifest().domains ?? {}) as Record<
      string,
      { present?: boolean }
    >;
    const domain = str(t.fm.domain);
    if (!domain || !domains[domain]?.present)
      errs.push(`domain '${domain}' not present in manifest`);
    const tacs = this.tacs(t);
    if (!tacs.length || tacs.some((x) => !x.text))
      errs.push("needs ≥1 TAC, each with text");
    if (!list(t.fm.traces).length) errs.push("traces must list ≥1 epic AC");
    for (const d of list(t.fm.depends_on)) {
      try {
        this.findRec(d);
      } catch {
        errs.push(`dependency ${d} missing`);
      }
    }
    if (typeof t.fm.ui !== "boolean") errs.push("ui must be true|false");
    if (!str(t.fm.owner) || t.fm.owner === "unassigned") {
      errs.push(
        `no engineer for domain '${domain}' (add delivery.engineers.${domain} to the manifest)`,
      );
    }
    if (!["small", "normal", "high"].includes(str(t.fm.risk)))
      errs.push("risk must be small|normal|high");
    if (!meaningful(section(t.body, "Technical approach")))
      errs.push("Technical approach is empty");
    return errs;
  }

  artifact(t: Rec, kind: string): string {
    const folder =
      kind === "design" || kind === "design-review" ? "designs" : "qa";
    return join(this.recDir(t), folder, str(t.fm.id), ARTIFACTS[kind] ?? kind);
  }

  private ticketHead(t: Rec): string | null {
    return this.git(["rev-parse", `ticket/${str(t.fm.id)}`], this.root, true);
  }

  private docsOnlySince(head: string | null, cur: string | null): boolean {
    if (!head || !cur) return false;
    if (head === cur) return true;
    if (!this.gitOk(["merge-base", "--is-ancestor", head, cur])) return false;
    return (this.git(["diff", "--name-only", head, cur]) ?? "")
      .split("\n")
      .filter(Boolean)
      .every((p) => /\.(md|mdx|txt)$/i.test(p) || p.startsWith("docs/"));
  }

  private gatesOk(t: Rec, allowDocsAfter = false): string | null {
    const f = this.artifact(t, "gates-log");
    if (!existsSync(f))
      return `no gates log (run: sdlckit-delivery gates ${str(t.fm.id)})`;
    const log = readFileSync(f, "utf8");
    const head = log.match(/^HEAD: (\w+)/m)?.[1] ?? null;
    if (!/^RESULT: PASS$/m.test(log)) return "last gates run FAILED";
    const cur = this.ticketHead(t);
    if (!cur) return "ticket branch missing";
    if (head === cur || (allowDocsAfter && this.docsOnlySince(head, cur)))
      return null;
    return `gates log is for ${head?.slice(0, 8)}, branch is at ${cur.slice(0, 8)}: rerun gates`;
  }

  private qaCurrent(t: Rec, allowDocsAfter = false): string | null {
    const q = this.lastQaRound(t);
    if (!q) return "no QA round recorded";
    const cur = this.ticketHead(t);
    if (q.head === cur || (allowDocsAfter && this.docsOnlySince(q.head, cur)))
      return null;
    return `last QA round tested ${q.head ? q.head.slice(0, 8) : "(no HEAD)"}, branch is at ${cur?.slice(0, 8)}: QA must re-test`;
  }

  private qaLockPath(t: Rec): string {
    return join(this.recDir(t), "qa", str(t.fm.id), "tests.lock");
  }

  private qaTestsIntact(t: Rec): string | null {
    const f = this.qaLockPath(t);
    if (!existsSync(f)) return null;
    const head = this.ticketHead(t);
    for (const line of readFileSync(f, "utf8").split("\n").filter(Boolean)) {
      const hash = line.slice(0, line.indexOf(" "));
      const file = line.slice(line.indexOf(" ") + 1);
      if (
        this.git(["rev-parse", `${head}:${file}`], this.root, true) !== hash
      ) {
        return `QA test ${file} was changed or removed after QA locked it: only qa-specialist may change it (then re-run qa-lock)`;
      }
    }
    return null;
  }

  private reviewOk(t: Rec): string | null {
    const f = this.artifact(t, "review");
    if (!existsSync(f))
      return `no review record (run: sdlckit-delivery review ${str(t.fm.id)} --blockers N --majors N)`;
    const r = readFileSync(f, "utf8");
    if (r.match(/^HEAD: (\w+)/m)?.[1] !== this.ticketHead(t))
      return "review record is for an older commit: re-review";
    if (!/^OPEN_BLOCKERS: 0$/m.test(r) || !/^OPEN_MAJORS: 0$/m.test(r))
      return "open blocker/major findings remain";
    return null;
  }

  private lastQaRound(t: Rec): QaRound | null {
    const f = this.artifact(t, "qa-report");
    if (!existsSync(f)) return null;
    const parts = readFileSync(f, "utf8").split(/^## Round /m);
    if (parts.length < 2) return null;
    const last = parts[parts.length - 1] ?? "";
    return {
      head: last.match(/^HEAD: (\w+)/m)?.[1] ?? null,
      verdict: last.match(/^VERDICT: (PASS|FAIL)$/m)?.[1] ?? null,
      tac: Object.fromEntries(
        [...last.matchAll(/^(TAC\d+): (PASS|FAIL)/gm)].map((m) => [
          m[1] ?? "",
          m[2] ?? "",
        ]),
      ),
    };
  }

  private designApproved(t: Rec): string | null {
    const design = this.artifact(t, "design");
    const review = this.artifact(t, "design-review");
    if (!existsSync(design)) return "design.md missing";
    if (!existsSync(review)) return "design review missing";
    const componentMap =
      section(readFileSync(design, "utf8"), "Component map") ?? "";
    const rows = componentMap
      .split("\n")
      .filter(
        (l) =>
          /^\|/.test(l) &&
          !/^\|\s*(Region|-)/.test(l) &&
          l.replace(/[|\s]/g, ""),
      );
    if (rows.length === 0) return "design.md Component map has no rows";
    const r = readFileSync(review, "utf8");
    if (!/^VERDICT: approved$/m.test(section(r, "product-owner") ?? ""))
      return "product-owner has not approved the design";
    if (!/^VERDICT: approved$/m.test(section(r, "tech-lead") ?? ""))
      return "tech-lead has not approved the design";
    return null;
  }

  private merged(t: Rec): boolean {
    const h = this.ticketHead(t);
    return (
      Boolean(h) &&
      this.gitOk([
        "merge-base",
        "--is-ancestor",
        h ?? "",
        `epic/${str(t.fm.epic)}`,
      ])
    );
  }

  dod(t: Rec): string[] {
    const errs: string[] = [];
    for (const x of this.tacs(t)) {
      if (!x.done) errs.push(`${x.id} not checked`);
      else if (!/\(evidence:\s*[^)]+\)/.test(x.text))
        errs.push(`${x.id} has no (evidence: …)`);
    }
    if (this.lastQaRound(t)?.verdict !== "PASS")
      errs.push("last QA round is not VERDICT: PASS");
    const qa = this.qaCurrent(t, true);
    if (qa) errs.push(`qa: ${qa}`);
    const gates = this.gatesOk(t, true);
    if (gates) errs.push(`gates: ${gates}`);
    const review = this.artifact(t, "review");
    if (!existsSync(review)) errs.push("no review record");
    else {
      const r = readFileSync(review, "utf8");
      if (!/^OPEN_BLOCKERS: 0$/m.test(r) || !/^OPEN_MAJORS: 0$/m.test(r))
        errs.push("open blocker/major findings");
    }
    if (!meaningful(section(t.body, "Docs")))
      errs.push(
        'Docs section empty (write updates or "No docs impact: <reason>")',
      );
    const epic = this.findRec(str(t.fm.epic));
    if (!(section(epic.body, "Changelog") ?? "").includes(str(t.fm.id))) {
      errs.push(`no Changelog entry for ${str(t.fm.id)} in ${str(t.fm.epic)}`);
    }
    if (!this.merged(t))
      errs.push(
        `ticket/${str(t.fm.id)} not merged into epic/${str(t.fm.epic)}`,
      );
    return errs;
  }

  /**
   * Contract drift: error codes and HTTP routes named in the epic Architecture vs in its tickets.
   * Ticket-only codes count only when tied to an HTTP status (client-internal codes are not contract);
   * routes compare by shape, and an Architecture param segment (:id, {id}, <id>) matches any value.
   */
  drift(eid: string): {
    inArchitectureOnly: string[];
    inTicketsOnly: string[];
    checked: { codes: number; routes: number };
  } {
    const e = this.findRec(eid);
    const arch = contractTokens(section(e.body, "Architecture"));
    const tickets = this.epicTickets(eid).filter(
      (t) => t.fm.status !== "cancelled",
    );
    const tk = contractTokens(tickets.map((t) => t.body).join("\n"));
    const archOnly = [
      ...[...arch.codes].filter((c) => !tk.codes.has(c)),
      ...[...arch.routes].filter(
        (r) => ![...tk.routes].some((x) => routeMatch(r, x)),
      ),
    ];
    const tkOnly = [
      ...[...tk.statusCodes].filter((c) => !arch.codes.has(c)),
      ...[...tk.routes].filter(
        (x) => ![...arch.routes].some((r) => routeMatch(r, x)),
      ),
    ];
    return {
      inArchitectureOnly: archOnly.sort(),
      inTicketsOnly: tkOnly.sort(),
      checked: { codes: arch.codes.size, routes: arch.routes.size },
    };
  }

  private inFlight(): Rec[] {
    return this.allRecs("tickets")
      .map(readRec)
      .filter((r) => ["in-progress", "rework"].includes(str(r.fm.status)));
  }

  // ───────────── transitions ─────────────
  private checkEpic(e: Rec, to: string): string[] {
    const errs: string[] = [];
    const eid = str(e.fm.id);
    if (to === "proposed") {
      if (!meaningful(section(e.body, "Problem / WHY")))
        errs.push("Problem / WHY empty");
      if (!/^- AC\d+:\s*\S/m.test(section(e.body, "Acceptance criteria") ?? ""))
        errs.push("needs ≥1 AC with text");
    }
    if (to === "planned") {
      if (!this.isCut(eid)) errs.push("epic not cut (sdlckit-delivery cut)");
      const tickets = this.epicTickets(eid).filter(
        (t) => t.fm.status !== "cancelled",
      );
      if (!tickets.length) errs.push("no tickets");
      for (const t of tickets) {
        const d = this.dor(t);
        if (d.length) errs.push(`${str(t.fm.id)} fails DoR: ${d.join("; ")}`);
      }
      const acs = [
        ...(section(e.body, "Acceptance criteria") ?? "").matchAll(
          /^- (AC\d+):/gm,
        ),
      ].map((m) => m[1] ?? "");
      const traced = new Set(tickets.flatMap((t) => list(t.fm.traces)));
      for (const a of acs)
        if (!traced.has(a)) errs.push(`${a} is not traced by any ticket`);
      const d = this.drift(eid);
      if (d.inArchitectureOnly.length)
        errs.push(
          `contract in Architecture but in no ticket: ${d.inArchitectureOnly.join(", ")}`,
        );
      if (d.inTicketsOnly.length)
        errs.push(
          `contract in tickets but not in Architecture: ${d.inTicketsOnly.join(", ")}`,
        );
    }
    if (to === "in-acceptance") {
      for (const t of this.epicTickets(eid)) {
        if (!["done", "cancelled"].includes(str(t.fm.status)))
          errs.push(`${str(t.fm.id)} is ${str(t.fm.status)}`);
      }
      const report = join(this.recDir(e), "reports", `${eid}.md`);
      if (
        !existsSync(report) ||
        !meaningful(section(readFileSync(report, "utf8"), "What was delivered"))
      ) {
        errs.push("epic report missing or empty");
      }
    }
    return errs;
  }

  private checkTicket(t: Rec, to: string): string[] {
    const errs: string[] = [];
    const push = (x: string | null) => {
      if (x) errs.push(x);
    };
    if (to === "in-design" && !t.fm.ui)
      errs.push("ui:false tickets skip design");
    if (to === "ready") {
      if (t.fm.ui && t.fm.status !== "design-approved")
        errs.push("ui ticket needs design-approved first");
      errs.push(...this.dor(t));
    }
    if (to === "design-approved") push(this.designApproved(t));
    if (to === "in-progress") {
      const e = this.findRec(str(t.fm.epic));
      if (e.fm.status !== "in-delivery")
        errs.push(`epic is ${str(e.fm.status)}, not in-delivery`);
      for (const d of list(t.fm.depends_on)) {
        const r = this.findRec(d);
        if (r.fm.status !== "done")
          errs.push(`dependency ${d} is ${str(r.fm.status)}`);
      }
      const plan = this.artifact(t, "qa-plan");
      if (
        !existsSync(plan) ||
        !/\|\s*TAC\d+\s*\|/.test(readFileSync(plan, "utf8"))
      ) {
        errs.push("QA test plan missing (QA writes it at ready, before code)");
      }
      const max = this.config().maxParallelEngineers;
      if (this.inFlight().length >= max)
        errs.push(`engineer slots full (${max})`);
      if (!existsSync(this.ticketWt(str(t.fm.id))))
        errs.push(`no worktree (sdlckit-delivery worktree ${str(t.fm.id)})`);
    }
    if (to === "in-qa") {
      push(this.gatesOk(t));
      push(this.reviewOk(t));
      push(this.qaTestsIntact(t));
    }
    if (to === "rework") {
      if (this.lastQaRound(t)?.verdict !== "FAIL")
        errs.push("last QA round is not VERDICT: FAIL");
      const cap = this.config().qaReworkCap;
      if (num(t.fm.qa_round) >= cap) {
        errs.push(
          `rework cap ${cap} reached: transition to blocked (unblock-owner tech-lead)`,
        );
      }
    }
    if (to === "qa-passed") {
      const q = this.lastQaRound(t);
      if (q?.verdict !== "PASS")
        errs.push("last QA round is not VERDICT: PASS");
      else
        for (const x of this.tacs(t))
          if (q.tac[x.id] !== "PASS")
            errs.push(`${x.id} not PASS in last QA round`);
      push(this.gatesOk(t));
      push(this.qaCurrent(t));
      push(this.qaTestsIntact(t));
    }
    if (to === "done") errs.push(...this.dod(t));
    return errs;
  }

  transition(id: string, to: string, opts: Opts): void {
    const rec = this.findRec(id);
    const from = str(rec.fm.status);
    const isEpic = id.startsWith("E-");
    const reason = typeof opts.reason === "string" ? opts.reason : "";
    if (to === "blocked") {
      const owner = opts["unblock-owner"];
      if (!reason || typeof owner !== "string")
        throw new DeliveryError("blocked needs --reason and --unblock-owner");
      rec.fm.blocked_from = from;
      rec.fm.blocked_reason = reason;
      rec.fm.unblock_owner = owner;
    } else if (to === "cancelled") {
      if (!reason) throw new DeliveryError("cancelled needs --reason");
    } else if (from === "blocked") {
      if (to !== rec.fm.blocked_from) {
        throw new DeliveryError(
          `blocked ${id} can only return to ${str(rec.fm.blocked_from)}`,
        );
      }
      delete rec.fm.blocked_from;
      delete rec.fm.blocked_reason;
      delete rec.fm.unblock_owner;
    } else {
      const allowed = (isEpic ? EPIC_T : TICKET_T)[from] ?? [];
      if (!allowed.includes(to)) {
        throw new DeliveryError(
          `illegal transition ${id}: ${from} → ${to} (allowed: ${allowed.join(", ") || "none"}${isEpic ? "; gated moves use `gate`" : ""})`,
        );
      }
      const errs = isEpic ? this.checkEpic(rec, to) : this.checkTicket(rec, to);
      if (errs.length)
        throw new DeliveryError(
          `cannot move ${id} ${from} → ${to}:\n  - ${errs.join("\n  - ")}`,
          2,
        );
    }
    if (to === "in-qa" && !isEpic) rec.fm.qa_round = num(rec.fm.qa_round) + 1;
    rec.fm.status = to;
    appendHistory(rec, `${from} → ${to}${reason ? ` (${reason})` : ""}`);
    writeRec(rec);
    this.commitRecords(
      this.epicOf(rec),
      `${id} ${from} → ${to}`,
      to === "done" || (isEpic && to === "in-acceptance"),
    );
    this.out(`${id}: ${from} → ${to}`);
  }

  gate(eid: string, which: string): void {
    const e = this.findRec(eid);
    const pair = GATES[which];
    if (!pair) throw new DeliveryError("gate must be intake|plan|acceptance");
    const [needs, becomes] = pair;
    if (e.fm.status !== needs)
      throw new DeliveryError(
        `${eid} is ${str(e.fm.status)}; ${which} gate needs ${needs}`,
        2,
      );
    e.fm.gates = { ...map(e.fm.gates), [which]: today() };
    const from = str(e.fm.status);
    e.fm.status = becomes;
    appendHistory(e, `${which} gate approved by PO → ${becomes}`);
    writeRec(e);
    this.commitRecords(eid, `${eid} ${which} gate → ${becomes}`, true);
    this.out(`${eid}: ${from} → ${becomes} (${which} gate)`);
  }

  // ───────────── git workflow ─────────────
  private setupWorktree(wt: string): void {
    const rel = relative(this.root, this.manifestPath);
    if (!existsSync(join(wt, rel))) {
      mkdirSync(dirname(join(wt, rel)), { recursive: true });
      copyFileSync(this.manifestPath, join(wt, rel));
    }
    for (const f of this.config().worktreeCopy) {
      const src = join(this.root, f);
      const dst = join(wt, f);
      if (existsSync(src) && !existsSync(dst)) {
        mkdirSync(dirname(dst), { recursive: true });
        copyFileSync(src, dst);
      }
    }
    const setup = this.config().worktreeSetup;
    if (setup) {
      const r = spawnSync("sh", ["-c", setup], { cwd: wt, stdio: "inherit" });
      if (r.status !== 0)
        throw new DeliveryError(`worktreeSetup failed in ${wt}`);
    }
  }

  cut(eid: string): void {
    const e = this.findRec(eid);
    if (this.isCut(eid)) {
      this.out(this.epicWt(eid));
      return;
    }
    if (!["approved", "planned"].includes(str(e.fm.status))) {
      throw new DeliveryError(
        `${eid} is ${str(e.fm.status)}; cut after intake approval`,
        2,
      );
    }
    const br = `epic/${eid}`;
    if (!this.gitOk(["rev-parse", "--verify", "--quiet", br]))
      this.git(["branch", br, this.config().baseBranch]);
    mkdirSync(this.wtRoot(), { recursive: true });
    this.git(["worktree", "add", "-q", this.epicWt(eid), br]);
    // move the epic record out of the main checkout so later pulls never collide with it
    const dst = join(this.epicWt(eid), this.config().dir, "epics");
    mkdirSync(dst, { recursive: true });
    const tracked = this.gitOk(["ls-files", "--error-unmatch", e.file]);
    copyFileSync(e.file, join(dst, basename(e.file)));
    if (tracked) {
      // committed on base: the epic branch carries it and the PR merge reconciles a one-sided change
      this.err(
        `note: ${relative(this.root, e.file)} is committed on your branch; the live copy is now on ${br} and comes back through the epic PR. Leave your copy as is.`,
      );
    } else unlinkSync(e.file);
    for (const d of ["tickets", "designs", "qa", "adr", "reports"]) {
      mkdirSync(join(this.epicWt(eid), this.config().dir, d), {
        recursive: true,
      });
    }
    this.setupWorktree(this.epicWt(eid));
    this.commitRecords(eid, `${eid} cut epic branch`, true);
    this.out(this.epicWt(eid));
  }

  worktree(tid: string): void {
    const t = this.findRec(tid);
    const wt = this.ticketWt(tid);
    if (existsSync(wt)) {
      this.out(wt);
      return;
    }
    const epic = str(t.fm.epic);
    if (!this.isCut(epic)) throw new DeliveryError(`epic ${epic} not cut`);
    const br = `ticket/${tid}`;
    if (!this.gitOk(["rev-parse", "--verify", "--quiet", br]))
      this.git(["branch", br, `epic/${epic}`]);
    this.git(["worktree", "add", "-q", wt, br]);
    this.setupWorktree(wt);
    this.out(wt);
  }

  /** Runs the manifest gates in the ticket worktree and records the result against its HEAD. */
  gates(tid: string, names: string[]): boolean {
    const t = this.findRec(tid);
    const wt = this.ticketWt(tid);
    if (!existsSync(wt)) throw new DeliveryError(`no worktree for ${tid}`);
    const gates = names.length ? names : this.config().gates;
    const run = runRepoGates(wt, gates);
    const report = formatGates(run);
    const head = this.git(["rev-parse", "HEAD"], wt) ?? "";
    const f = this.artifact(t, "gates-log");
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(
      f,
      `HEAD: ${head}\nDATE: ${new Date().toISOString()}\nGATES: ${gates.join(" ")}\nRESULT: ${run.passed ? "PASS" : "FAIL"}\n\n${report}`,
    );
    t.fm.red_gate_runs = run.passed ? 0 : num(t.fm.red_gate_runs) + 1;
    writeRec(t);
    this.out(report.slice(-6000).trimEnd());
    this.out(
      `\n${tid} gates: ${run.passed ? "PASS" : "FAIL"} @ ${head.slice(0, 8)} (log: ${f})`,
    );
    return run.passed;
  }

  review(tid: string, opts: Opts): void {
    const t = this.findRec(tid);
    const head = this.ticketHead(t);
    if (!head) throw new DeliveryError("no ticket branch");
    const b = Number(opts.blockers);
    const m = Number(opts.majors);
    if (!Number.isInteger(b) || !Number.isInteger(m))
      throw new DeliveryError("--blockers and --majors are required integers");
    const f = this.artifact(t, "review");
    mkdirSync(dirname(f), { recursive: true });
    const reviewers =
      typeof opts.reviewers === "string" ? opts.reviewers : "unspecified";
    writeFileSync(
      f,
      `HEAD: ${head}\nDATE: ${new Date().toISOString()}\nREVIEWERS: ${reviewers}\nOPEN_BLOCKERS: ${b}\nOPEN_MAJORS: ${m}\n`,
    );
    this.out(
      `${tid} review recorded @ ${head.slice(0, 8)}: blockers=${b} majors=${m}`,
    );
  }

  qaRound(tid: string): void {
    const t = this.findRec(tid);
    if (t.fm.status !== "in-qa")
      throw new DeliveryError(
        `${tid} is ${str(t.fm.status)}; QA rounds happen in in-qa`,
        2,
      );
    const head = this.ticketHead(t);
    const f = this.artifact(t, "qa-report");
    if (!existsSync(f)) {
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(
        f,
        this.template("qa-report.md", { id: tid, title: str(t.fm.title) }),
      );
    }
    const n = num(t.fm.qa_round) || 1;
    if (new RegExp(`^## Round ${n}\\b`, "m").test(readFileSync(f, "utf8"))) {
      this.out(f);
      return;
    }
    const lines = this.tacs(t)
      .map((x) => `${x.id}: TBD — ${x.text}`)
      .join("\n");
    appendFileSync(
      f,
      `\n## Round ${n}\nHEAD: ${head}\nDATE: ${new Date().toISOString()}\n${lines}\nVERDICT: TBD\n`,
    );
    this.out(f);
  }

  /** Locks QA's acceptance tests by blob hash; engineers may not change them. */
  qaLock(tid: string, files: string[]): void {
    const t = this.findRec(tid);
    const head = this.ticketHead(t);
    if (!head) throw new DeliveryError("no ticket branch");
    if (!files.length)
      throw new DeliveryError(
        "qa-lock needs --files a,b (repo-relative test paths committed on the ticket branch)",
      );
    const lines = files.map((f) => {
      const h = this.git(["rev-parse", `${head}:${f}`], this.root, true);
      if (!h) throw new DeliveryError(`${f} is not committed on ticket/${tid}`);
      return `${h} ${f}`;
    });
    mkdirSync(dirname(this.qaLockPath(t)), { recursive: true });
    writeFileSync(this.qaLockPath(t), `${lines.join("\n")}\n`);
    this.out(
      `${tid}: locked ${files.length} QA test file(s) @ ${head.slice(0, 8)}`,
    );
  }

  changelog(tid: string, text: string): void {
    const t = this.findRec(tid);
    if (!text) throw new DeliveryError("changelog needs text");
    const e = this.findRec(str(t.fm.epic));
    const line = `- ${tid}: ${text.replace(/\n/g, " ").trim()}`;
    if (!/^## Changelog\s*$/m.test(e.body))
      e.body = e.body.replace(/^## History/m, "## Changelog\n\n## History");
    const existing = new RegExp(`^- ${tid}:.*$`, "m");
    e.body = existing.test(e.body)
      ? e.body.replace(existing, line)
      : e.body.replace(
          /^## Changelog\s*\n((?:<!--.*-->\n)?(?:- .*\n)*)/m,
          (m) => `${m}${line}\n`,
        );
    writeRec(e);
    this.out(line);
  }

  merge(tid: string): void {
    const t = this.findRec(tid);
    if (t.fm.status !== "qa-passed")
      throw new DeliveryError(
        `${tid} is ${str(t.fm.status)}; merge needs qa-passed`,
        2,
      );
    const epic = str(t.fm.epic);
    const br = `ticket/${tid}`;
    const ebr = `epic/${epic}`;
    const base = this.git(["merge-base", ebr, br]) ?? "";
    const dir = this.config().dir;
    const touched = (this.git(["diff", "--name-only", base, br]) ?? "")
      .split("\n")
      .filter((p) => p.startsWith(`${dir}/`));
    if (touched.length) {
      throw new DeliveryError(
        `${br} modifies delivery records (${touched.join(", ")}); engineers must not edit ${dir}/`,
        2,
      );
    }
    this.commitRecords(epic, `${tid} records`, true);
    const r = spawnSync(
      "git",
      ["merge", "--no-ff", "-q", "-m", `merge ${br}: ${str(t.fm.title)}`, br],
      {
        cwd: this.epicWt(epic),
        encoding: "utf8",
      },
    );
    if (r.status !== 0) {
      spawnSync("git", ["merge", "--abort"], { cwd: this.epicWt(epic) });
      throw new DeliveryError(
        `merge conflict merging ${br} into ${ebr}: rebase the ticket branch onto ${ebr} and re-run gates:\n${r.stdout}${r.stderr}`,
        2,
      );
    }
    if (existsSync(this.ticketWt(tid)))
      this.git(["worktree", "remove", "--force", this.ticketWt(tid)]);
    this.out(`${br} merged into ${ebr}`);
  }

  cleanup(eid: string): void {
    const base = this.config().baseBranch;
    if (
      !this.gitOk([
        "merge-base",
        "--is-ancestor",
        `epic/${eid}`,
        `origin/${base}`,
      ])
    ) {
      throw new DeliveryError(
        `epic/${eid} is not merged into origin/${base} yet (git fetch first?)`,
        2,
      );
    }
    for (const t of this.epicTickets(eid)) {
      const wt = this.ticketWt(str(t.fm.id));
      if (existsSync(wt)) this.git(["worktree", "remove", "--force", wt]);
    }
    if (existsSync(this.epicWt(eid)))
      this.git(["worktree", "remove", "--force", this.epicWt(eid)]);
    this.out(
      `removed worktrees for ${eid}; branches kept (delete them with git branch -d when you like)`,
    );
  }

  // ───────────── model and effort routing ─────────────
  // Every role runs on routing.model (haiku). Only effort varies, and it only rises on rework.
  model(role: string, id?: string): void {
    const routing = this.routing();
    const shortRole = role.includes(":")
      ? (role.split(":").pop() ?? role)
      : role;
    const isEngineer =
      shortRole.endsWith("-engineer") &&
      !["staff-engineer", "devops-engineer"].includes(shortRole);
    const rec = id ? this.findRec(id) : null;
    const reasons: string[] = [];
    let key = isEngineer ? "engineer" : shortRole;
    if (
      isEngineer &&
      rec?.fm.risk === "small" &&
      routing.effort["engineer@small"]
    )
      key = "engineer@small";
    const roleEffort = routing.effort[key];
    if (!roleEffort)
      throw new DeliveryError(`role ${role} not in routing.effort`);
    let effort: string = roleEffort;
    const raise = (target: string): string =>
      routing.effortLevels.indexOf(target) >
      routing.effortLevels.indexOf(effort)
        ? target
        : effort;
    if (isEngineer && rec) {
      if (num(rec.fm.qa_round) >= routing.escalation.engineerQaRound) {
        effort = raise(routing.escalation.engineerEffort);
        reasons.push(`qa_round ${num(rec.fm.qa_round)}`);
      } else if (
        num(rec.fm.red_gate_runs) >= routing.escalation.engineerRedGateRuns
      ) {
        effort = raise(routing.escalation.engineerEffort);
        reasons.push(`${num(rec.fm.red_gate_runs)} red gate runs`);
      }
    }
    if (shortRole === "solution-architect" && rec) {
      const epic = str(rec.fm.id).startsWith("E-")
        ? rec
        : this.findRec(str(rec.fm.epic));
      if (epic.fm.risk === routing.escalation.architectOnEpicRisk) {
        effort = raise(routing.escalation.architectEffortOnEpicRisk);
        reasons.push("epic risk high");
      }
    }
    if (reasons.length && rec && str(rec.fm.id).startsWith("T-")) {
      rec.fm.effort_overrides = {
        ...map(rec.fm.effort_overrides),
        [shortRole]: effort,
      };
      writeRec(rec);
    }
    this.out(
      JSON.stringify({
        role: shortRole,
        model: routing.model,
        effort,
        escalated: reasons.length > 0,
        reasons,
      }),
    );
  }

  // ───────────── scheduling, stats, board ─────────────
  next(eid: string): void {
    const tickets = this.epicTickets(eid);
    const byId = new Map(tickets.map((t) => [str(t.fm.id), t]));
    const depsDone = (t: Rec) =>
      list(t.fm.depends_on).every(
        (d) => (byId.get(d) ?? this.findRec(d)).fm.status === "done",
      );
    const slots = Math.max(
      0,
      this.config().maxParallelEngineers - this.inFlight().length,
    );
    const ids = (pred: (t: Rec) => boolean) =>
      tickets.filter(pred).map((t) => str(t.fm.id));
    const status = (t: Rec) => str(t.fm.status);
    const done = tickets.filter((t) =>
      ["done", "cancelled"].includes(status(t)),
    ).length;
    const result = {
      epic: eid,
      epicStatus: str(this.findRec(eid).fm.status),
      slotsFree: slots,
      needsDesign: ids(
        (t) => Boolean(t.fm.ui) && ["todo", "in-design"].includes(status(t)),
      ),
      needsReady: ids(
        (t) =>
          (status(t) === "todo" && !t.fm.ui) || status(t) === "design-approved",
      ),
      needsQaPlan: ids(
        (t) =>
          status(t) === "ready" && !existsSync(this.artifact(t, "qa-plan")),
      ),
      startable: ids(
        (t) =>
          status(t) === "ready" &&
          depsDone(t) &&
          existsSync(this.artifact(t, "qa-plan")),
      ).slice(0, slots),
      inProgress: ids((t) => status(t) === "in-progress"),
      inQa: ids((t) => status(t) === "in-qa"),
      rework: ids((t) => status(t) === "rework"),
      qaPassed: ids((t) => status(t) === "qa-passed"),
      blocked: tickets
        .filter((t) => status(t) === "blocked")
        .map((t) => ({
          id: str(t.fm.id),
          reason: str(t.fm.blocked_reason),
          owner: str(t.fm.unblock_owner),
        })),
      done,
      total: tickets.length,
      allDone: tickets.length > 0 && done === tickets.length,
    };
    this.out(JSON.stringify(result, null, 2));
  }

  stats(eid: string): void {
    const e = this.findRec(eid);
    const tickets = this.epicTickets(eid);
    const created =
      (section(e.body, "History") ?? "").match(
        /^- (\d{4}-\d{2}-\d{2}) .*created/m,
      )?.[1] ?? null;
    const gates = map(e.fm.gates);
    const result = {
      epic: eid,
      status: str(e.fm.status),
      risk: str(e.fm.risk),
      gates,
      tickets: tickets.length,
      byStatus: tickets.reduce<Record<string, number>>((acc, t) => {
        acc[str(t.fm.status)] = (acc[str(t.fm.status)] ?? 0) + 1;
        return acc;
      }, {}),
      qaRounds: tickets.reduce((acc, t) => acc + num(t.fm.qa_round), 0),
      reworkTickets: tickets
        .filter((t) => num(t.fm.qa_round) > 1)
        .map((t) => `${str(t.fm.id)} (${num(t.fm.qa_round)} rounds)`),
      escalations: tickets.flatMap((t) =>
        Object.entries(map(t.fm.effort_overrides)).map(
          ([role, e]) => `${str(t.fm.id)}: ${role} → effort ${str(e)}`,
        ),
      ),
      cancelled: tickets
        .filter((t) => t.fm.status === "cancelled")
        .map((t) => str(t.fm.id)),
      started: created,
      planApproved: gates.plan ?? null,
      accepted: gates.acceptance ?? null,
      perTicket: tickets.map((t) => ({
        id: str(t.fm.id),
        domain: str(t.fm.domain),
        risk: str(t.fm.risk),
        ui: t.fm.ui ?? null,
        status: str(t.fm.status),
        qaRounds: num(t.fm.qa_round),
        traces: list(t.fm.traces),
      })),
    };
    this.out(JSON.stringify(result, null, 2));
  }

  /**
   * Renders the repo's status file (`docs.statusFile`): rows whose ID is an epic `ref` are
   * rewritten, epics without one get their own row, other rows are kept, and the pie is recounted.
   * Only the first `| ID | …` table and its pie are touched.
   */
  statusMd(eid?: string): void {
    const rel = this.config().docs.statusFile;
    if (!rel)
      throw new DeliveryError("no delivery.docs.statusFile in the manifest");
    const file = join(eid ? this.epicWt(eid) : this.root, rel);
    if (!existsSync(file)) throw new DeliveryError(`${file} not found`);
    const lines = readFileSync(file, "utf8").split("\n");
    const hdr = lines.findIndex((l) => /^\|\s*ID\s*\|/.test(l));
    if (hdr < 0) throw new DeliveryError(`no "| ID | …" table in ${rel}`);
    let end = hdr + 2;
    while (end < lines.length && (lines[end] ?? "").startsWith("|")) end++;
    const label = (st: string) =>
      ({
        done: "✅ done",
        cancelled: "🗑️ cancelled",
        blocked: "⛔ blocked",
        "in-delivery": "🚧 doing",
        "in-acceptance": "🚧 doing",
      })[st] ?? "📥 todo";
    const nextAction = (e: Rec) => {
      const id = str(e.fm.id);
      const tickets = this.epicTickets(id);
      const done = tickets.filter((t) => t.fm.status === "done").length;
      const actions: Record<string, string> = {
        draft: `${id}: draft, /po intake`,
        proposed: `${id}: waiting for your intake gate`,
        approved: `${id}: /refine`,
        planned: `${id}: waiting for your plan gate`,
        "in-delivery": `${id}: ${done}/${tickets.length} tickets done`,
        "in-acceptance": `${id}: waiting for your acceptance (/accept)`,
        done: `none; ${id} accepted ${str(map(e.fm.gates).acceptance)}`.trim(),
        blocked: `${id}: blocked, ${str(e.fm.blocked_reason)} (unblock: ${str(e.fm.unblock_owner)})`,
        cancelled: `${id}: cancelled`,
      };
      return actions[str(e.fm.status)] ?? id;
    };
    const epics = this.allRecs("epics").map(readRec);
    const byRef = new Map(
      epics.filter((e) => e.fm.ref).map((e) => [str(e.fm.ref), e]),
    );
    const cell = (s: string) => s.replace(/\|/g, "\\|");
    const rows = lines.slice(hdr + 2, end).map((l) => {
      const c = l
        .split("|")
        .slice(1, -1)
        .map((x) => x.trim());
      const e = byRef.get(c[0] ?? "");
      if (!e) return l;
      byRef.delete(c[0] ?? "");
      return `| ${c[0]} | ${c[1]} | ${label(str(e.fm.status))} | ${cell(nextAction(e))} |`;
    });
    for (const e of [...byRef.values(), ...epics.filter((x) => !x.fm.ref)]) {
      rows.push(
        `| ${str(e.fm.ref) || str(e.fm.id)} | ${cell(str(e.fm.title))} | ${label(str(e.fm.status))} | ${cell(nextAction(e))} |`,
      );
    }
    const count = (k: string) =>
      rows.filter((r) => (r.split("|")[3] ?? "").includes(k)).length;
    let out = [...lines.slice(0, hdr + 2), ...rows, ...lines.slice(end)].join(
      "\n",
    );
    out = out.replace(
      /(pie[^\n]*\n(?:\s*title[^\n]*\n)?)((?:\s*"[^"]+"\s*:\s*\d+\n)+)/,
      (_m, head: string, body: string) => {
        const indent = body.match(/^(\s*)/)?.[1] ?? "";
        const parts: [string, number][] = [
          ["Done", count("done")],
          ["Doing", count("doing")],
          ["To do", count("todo")],
          ["Blocked", count("blocked")],
        ];
        return `${head}${parts
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${indent}"${k}" : ${n}`)
          .join("\n")}\n`;
      },
    );
    writeFileSync(file, out);
    this.out(
      `rendered ${relative(this.root, file) || file} (${rows.length} rows)`,
    );
  }

  board(): string {
    const epics = this.allRecs("epics")
      .map(readRec)
      .sort((a, b) => str(a.fm.id).localeCompare(str(b.fm.id)));
    const waiting: Record<string, string> = {
      proposed: "intake",
      planned: "plan",
      "in-acceptance": "acceptance",
    };
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    let md = `# Delivery board: ${basename(this.root)}\n_Rendered ${stamp} by sdlckit-delivery. Do not edit._\n\n`;
    const you = epics.filter((e) => waiting[str(e.fm.status)]);
    md += `## Waiting for you\n${
      you.length
        ? you
            .map(
              (e) =>
                `- **${str(e.fm.id)}** ${str(e.fm.title)}: ${waiting[str(e.fm.status)]} gate`,
            )
            .join("\n")
        : "- nothing"
    }\n\n`;
    const blocked = [...epics, ...this.allRecs("tickets").map(readRec)].filter(
      (r) => r.fm.status === "blocked",
    );
    md += `## Blocked\n${
      blocked.length
        ? blocked
            .map(
              (r) =>
                `- **${str(r.fm.id)}** ${str(r.fm.title)}: ${str(r.fm.blocked_reason)} (unblock: ${str(r.fm.unblock_owner)})`,
            )
            .join("\n")
        : "- nothing"
    }\n\n## Epics\n`;
    for (const e of epics) {
      const tickets = this.epicTickets(str(e.fm.id)).sort((a, b) =>
        str(a.fm.id).localeCompare(str(b.fm.id)),
      );
      const done = tickets.filter((t) => t.fm.status === "done").length;
      const ref = e.fm.ref ? ` (${str(e.fm.ref)})` : "";
      md += `\n### ${str(e.fm.id)}${ref} · ${str(e.fm.title)}  \`${str(e.fm.status)}\` · ${str(e.fm.priority)} · ${done}/${tickets.length} done\n`;
      if (tickets.length) {
        md +=
          "| Ticket | Title | Domain | Status | QA round | Depends on |\n|---|---|---|---|---|---|\n";
        for (const t of tickets) {
          md += `| ${str(t.fm.id)} | ${str(t.fm.title)} | ${str(t.fm.domain)}${t.fm.ui ? " · ui" : ""} | ${str(t.fm.status)} | ${num(t.fm.qa_round)} | ${list(t.fm.depends_on).join(", ") || "—"} |\n`;
        }
      }
    }
    mkdirSync(this.mainDir(), { recursive: true });
    writeFileSync(join(this.mainDir(), "BOARD.md"), md);
    this.out(md.trimEnd());
    return md;
  }

  // ───────────── init, create, read, edit ─────────────
  init(): void {
    const d = this.mainDir();
    for (const s of [
      "intake",
      "epics",
      "tickets",
      "designs",
      "qa",
      "adr",
      "reports",
    ])
      mkdirSync(join(d, s), { recursive: true });
    const gitignore = join(this.root, ".gitignore");
    const dir = this.config().dir;
    const current = existsSync(gitignore)
      ? readFileSync(gitignore, "utf8")
      : "";
    if (!current.includes(`${dir}/.worktrees/`)) {
      appendFileSync(
        gitignore,
        `\n# sdlckit delivery (scratch)\n${dir}/.worktrees/\n${dir}/BOARD.md\n${dir}/qa/*/evidence/\n`,
      );
    }
    this.board();
    this.err(`\ninitialised ${d}`);
  }

  create(kind: string, o: Opts): void {
    const title = typeof o.title === "string" ? o.title : "";
    if (!title) throw new DeliveryError("--title required");
    const epicId = typeof o.epic === "string" ? o.epic : "";
    if (kind === "epic") {
      const id = this.nextId("E", "epics");
      const f = join(this.mainDir(), "epics", `${id}-${slug(title)}.md`);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, this.template("epic.md", { id, title, date: today() }));
      this.out(JSON.stringify({ id, file: f }));
      return;
    }
    if (kind === "ticket") {
      const domain = typeof o.domain === "string" ? o.domain : "";
      if (!epicId || !domain)
        throw new DeliveryError("--epic and --domain required");
      const e = this.findRec(epicId);
      if (!this.isCut(epicId)) throw new DeliveryError(`cut ${epicId} first`);
      const engineers = {
        ...this.routing().engineers,
        ...this.config().engineers,
      };
      const id = this.nextId("T", "tickets");
      const f = join(this.recDir(e), "tickets", `${id}-${slug(title)}.md`);
      writeFileSync(
        f,
        this.template("ticket.md", {
          id,
          epic: epicId,
          title,
          domain,
          owner: engineers[domain] ?? "unassigned",
          date: today(),
        }),
      );
      const rec = readRec(f);
      if (o.ui !== undefined) rec.fm.ui = o.ui === true || o.ui === "true";
      if (typeof o.risk === "string") rec.fm.risk = o.risk;
      if (typeof o.depends === "string") rec.fm.depends_on = csv(o.depends);
      if (typeof o.traces === "string") rec.fm.traces = csv(o.traces);
      writeRec(rec);
      this.out(JSON.stringify({ id, file: f }));
      return;
    }
    if (kind === "adr") {
      if (!epicId) throw new DeliveryError("--epic required");
      const e = this.findRec(epicId);
      if (this.adrDirMode()) {
        if (!this.isCut(epicId)) throw new DeliveryError(`cut ${epicId} first`);
        const max = Math.max(
          0,
          ...[...this.docAdrs().keys()].map((k) => Number(k.slice(4))),
        );
        const n = String(max + 1).padStart(4, "0");
        const dir = join(this.epicWt(epicId), this.config().docs.adrDir ?? "");
        mkdirSync(dir, { recursive: true });
        const f = join(dir, `${n}-${slug(title)}.md`);
        const ref = e.fm.ref ? ` (${str(e.fm.ref)})` : "";
        writeFileSync(
          f,
          `# ADR ${n}: ${title}\n\n- **Status:** proposed\n- **Epic:** ${epicId}${ref}\n- **Relates to:** \n\n## Context\n\n## Decision\n\n## Alternatives considered\n\n## Consequences\n`,
        );
        this.out(
          JSON.stringify({
            id: `ADR-${n}`,
            file: f,
            note: `repo ADR style (${this.config().docs.adrDir}); follow the format of existing ADRs there`,
          }),
        );
        return;
      }
      const id = this.nextId("ADR", "adr");
      const f = join(this.recDir(e), "adr", `${id}-${slug(title)}.md`);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(
        f,
        `---\nid: ${id}\nepic: ${epicId}\nstatus: proposed\n---\n${this.template("adr.md", { id, title, epic: epicId, date: today() })}`,
      );
      this.out(JSON.stringify({ id, file: f }));
      return;
    }
    throw new DeliveryError("new epic|ticket|adr");
  }

  path(id: string, kind?: string): void {
    const r = this.findRec(id);
    const rid = str(r.fm.id);
    if (kind === "report" || kind === "epic") {
      const f =
        kind === "epic" ? r.file : join(this.recDir(r), "reports", `${rid}.md`);
      if (!existsSync(f)) {
        mkdirSync(dirname(f), { recursive: true });
        writeFileSync(
          f,
          this.template("report.md", { id: rid, title: str(r.fm.title) }),
        );
      }
      this.out(f);
      return;
    }
    if (kind === "ticket" || !kind) {
      this.out(r.file);
      return;
    }
    if (kind === "worktree") {
      this.out(rid.startsWith("E-") ? this.epicWt(rid) : this.ticketWt(rid));
      return;
    }
    const f = this.artifact(r, kind);
    const tpl = ARTIFACT_TEMPLATES[kind];
    if (tpl && !existsSync(f)) {
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, this.template(tpl, { id: rid, title: str(r.fm.title) }));
    }
    this.out(f);
  }

  show(id: string): void {
    const r = this.findRec(id);
    this.out(JSON.stringify({ ...r.fm, file: r.file }, null, 2));
  }

  list(kind: string): void {
    for (const r of this.allRecs(kind === "tickets" ? "tickets" : "epics").map(
      readRec,
    )) {
      this.out(`${str(r.fm.id)}\t${str(r.fm.status)}\t${str(r.fm.title)}`);
    }
  }

  set(id: string, pairs: string[]): void {
    const rec = this.findRec(id);
    for (const p of pairs) {
      const i = p.indexOf("=");
      const k = p.slice(0, i);
      const v = p.slice(i + 1);
      const adrStatus =
        k === "status" &&
        id.startsWith("ADR-") &&
        ["proposed", "accepted", "superseded", "rejected"].includes(v);
      if (LOCKED_FIELDS.includes(k) && !adrStatus)
        throw new DeliveryError(`'${k}' is managed by sdlckit-delivery`);
      (rec.fm as Frontmatter)[k] = parseScalar(v) as Value;
    }
    writeRec(rec);
    this.out(JSON.stringify(rec.fm));
  }
}

function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function contractTokens(text: string | null): {
  codes: Set<string>;
  statusCodes: Set<string>;
  routes: Set<string>;
} {
  const t = (text ?? "").replace(/<!--[\s\S]*?-->/g, "");
  const codes = new Set<string>();
  const statusCodes = new Set<string>();
  const routes = new Set<string>();
  for (const m of t.matchAll(/code:\s*['"]([A-Z][A-Z0-9_]{3,})['"]/g))
    if (m[1]) codes.add(m[1]);
  for (const m of t.matchAll(
    /\b[1-5]\d\d\s+`?\{?\s*(?:code:\s*)?['"]?([A-Z][A-Z0-9_]{3,})\b/g,
  )) {
    if (m[1]) {
      codes.add(m[1]);
      statusCodes.add(m[1]);
    }
  }
  for (const m of t.matchAll(
    /\b(GET|POST|PUT|PATCH|DELETE)\s+`?(\/[\w\-/:{}<>. ]*?)(?=[`\s,;)?#]|$)/gm,
  )) {
    routes.add(`${m[1]} ${(m[2] ?? "").replace(/[./]+$/, "") || "/"}`);
  }
  return { codes, statusCodes, routes };
}

const isParam = (segment: string | undefined) =>
  /^(:\w+|\{\w+\}|<[^>]+>)$/.test(segment ?? "");

function routeMatch(archRoute: string, route: string): boolean {
  const [am, ap = ""] = archRoute.split(" ");
  const [rm, rp = ""] = route.split(" ");
  if (am !== rm) return false;
  const a = ap.split("/");
  const b = rp.split("/");
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg === b[i] || isParam(seg) || isParam(b[i]));
}

/** Validates an agent reply against the delivery output contract. The last ```yaml block wins. */
export function contractCheck(
  text: string,
  requiredRulebooks: string[],
): string[] {
  const blocks = [...text.matchAll(/```ya?ml\n([\s\S]*?)```/g)];
  const last = blocks[blocks.length - 1];
  if (!last) return ["no ```yaml block found"];
  const y = last[1] ?? "";
  const top = (k: string) => new RegExp(`^${k}:`, "m").test(y);
  const errs: string[] = [];
  for (const k of [
    "agent",
    "mode",
    "subject",
    "status",
    "summary",
    "artifacts",
    "items",
    "questions_for_user",
    "next",
    "rulebooks_read",
  ]) {
    if (!top(k)) errs.push(`missing top-level key '${k}'`);
  }
  const status = y.match(/^status:\s*(\S+)/m)?.[1];
  if (status && !["done", "changes-requested", "blocked"].includes(status)) {
    errs.push(`status '${status}' not in done|changes-requested|blocked`);
  }
  for (const k of ["role", "blockers", "majors", "minors", "epic"]) {
    if (top(k))
      errs.push(`non-contract key '${k}' (use items[] with severity)`);
  }
  const items = y.split(/^items:/m)[1] ?? "";
  for (const m of items.matchAll(/severity:\s*(\S+)/g)) {
    if (!["blocker", "major", "minor", "suggestion"].includes(m[1] ?? ""))
      errs.push(`bad severity '${m[1]}'`);
  }
  const read = (y.split(/^rulebooks_read:/m)[1] ?? "").split(/^\w+:/m)[0] ?? "";
  for (const r of requiredRulebooks)
    if (!read.includes(r))
      errs.push(`rulebook '${r}' not listed in rulebooks_read`);
  return errs;
}
