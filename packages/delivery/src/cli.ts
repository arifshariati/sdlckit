import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { contractCheck, Delivery, type Opts } from "./delivery.js";
import { DeliveryError } from "./errors.js";

const USAGE = `sdlckit-delivery <command>
  init                                   scaffold .delivery/ and the .gitignore block
  new epic --title T                     create a draft epic (main checkout)
  new ticket --epic E --title T --domain D [--ui true] [--risk small|normal|high] [--depends T-1,T-2] [--traces AC1,AC2]
  new adr --epic E --title T
  show <id> | list [epics|tickets]       read records
  path <id> [ticket|epic|report|design|design-review|qa-plan|qa-report|gates-log|review|worktree]
  set <id> key=value ...                 edit fields the script doesn't manage
  transition <id> <state> [--reason R] [--unblock-owner O]
  gate <E> intake|plan|acceptance        record the user's approval (only after an explicit yes)
  dor <T> | dod <T>                      Definition of Ready / Done checks
  drift <E>                              error codes and routes, Architecture vs tickets (enforced at planned)
  cut <E>                                create epic/E branch and worktree, move the epic record into it
  worktree <T>                           create the ticket/T worktree from the epic branch
  gates <T> [gate ...]                   run the manifest gates in the ticket worktree, write gates.log
  review <T> --blockers N --majors N [--reviewers a,b]
  qa-round <T>                           open the next QA round, stamped with the tested HEAD
  qa-lock <T> --files a,b                lock QA acceptance tests (engineers may not change them)
  changelog <T> <text>                   add or replace the ticket's line in the epic Changelog
  merge <T>                              merge a qa-passed ticket into the epic branch
  cleanup <E>                            remove worktrees after the epic PR is merged
  model <role> [id]                      resolve the model (haiku) and effort (role default and escalation)
  next <E>                               scheduling view (JSON)
  stats <E>                              epic stats for reports (JSON)
  status-md [--in E]                     render docs.statusFile's table and pie from records
  board                                  render .delivery/BOARD.md
  contract-check <file|-> [--rulebooks a,b]   validate an agent reply against the output contract`;

/** The installed plugin root (bin/..), which holds templates/ and routing.json. */
export function defaultHome(): string {
  if (process.env.SDLCKIT_DELIVERY_HOME)
    return process.env.SDLCKIT_DELIVERY_HOME;
  const script = process.argv[1];
  if (!script)
    throw new DeliveryError("cannot locate the plugin root: no script path");
  return join(dirname(realpathSync(script)), "..");
}

function parse(argv: string[]): { pos: string[]; opts: Opts } {
  const pos: string[] = [];
  const opts: Opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) opts[a.slice(2)] = true;
      else {
        opts[a.slice(2)] = next;
        i++;
      }
    } else pos.push(a);
  }
  return { pos, opts };
}

/** Runs one command. Returns the exit code; output goes through `out`/`err`. */
export function run(
  argv: string[],
  cwd: string,
  out: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  err: (line: string) => void = (line) => process.stderr.write(`${line}\n`),
  home: string = defaultHome(),
): number {
  const [command, ...rest] = argv;
  const { pos, opts } = parse(rest);
  const need = (n: number) => {
    if (pos.length < n)
      throw new DeliveryError(
        `usage error for '${command}': see sdlckit-delivery help`,
      );
  };
  const a = (i: number) => pos[i] ?? "";

  if (!command || command === "help") {
    out(USAGE);
    return 0;
  }
  if (command === "contract-check") {
    const file = a(0);
    if (!file)
      throw new DeliveryError(
        "usage: contract-check <reply-file | -> [--rulebooks a,b]",
        2,
      );
    if (file === "-" && process.stdin.isTTY)
      throw new DeliveryError("contract-check -: nothing piped on stdin", 2);
    const text = readFileSync(file === "-" ? 0 : file, "utf8");
    const required =
      typeof opts.rulebooks === "string"
        ? opts.rulebooks.split(",").filter(Boolean)
        : [];
    const errs = contractCheck(text, required);
    out(
      errs.length ? `CONTRACT FAIL\n - ${errs.join("\n - ")}` : "CONTRACT PASS",
    );
    return errs.length ? 2 : 0;
  }

  const d = new Delivery(cwd, home, out, err);
  switch (command) {
    case "init":
      d.init();
      return 0;
    case "new":
      need(1);
      d.create(a(0), opts);
      return 0;
    case "show":
      need(1);
      d.show(a(0));
      return 0;
    case "list":
      d.list(a(0));
      return 0;
    case "path":
      need(1);
      d.path(a(0), pos[1]);
      return 0;
    case "set":
      need(2);
      d.set(a(0), pos.slice(1));
      return 0;
    case "transition":
      need(2);
      d.transition(a(0), a(1), opts);
      return 0;
    case "gate":
      need(2);
      d.gate(a(0), a(1));
      return 0;
    case "dor":
    case "dod": {
      need(1);
      const rec = d.findRec(a(0));
      const errs = command === "dor" ? d.dor(rec) : d.dod(rec);
      const label = command === "dor" ? "DoR" : "DoD";
      out(
        errs.length
          ? `${label} FAIL\n - ${errs.join("\n - ")}`
          : `${label} PASS`,
      );
      return errs.length ? 2 : 0;
    }
    case "drift": {
      need(1);
      const result = d.drift(a(0));
      const bad =
        result.inArchitectureOnly.length + result.inTicketsOnly.length;
      out(JSON.stringify(result, null, 2));
      out(bad ? "DRIFT FAIL" : "DRIFT PASS");
      return bad ? 2 : 0;
    }
    case "cut":
      need(1);
      d.cut(a(0));
      return 0;
    case "worktree":
      need(1);
      d.worktree(a(0));
      return 0;
    case "gates":
      need(1);
      return d.gates(a(0), pos.slice(1)) ? 0 : 1;
    case "review":
      need(1);
      d.review(a(0), opts);
      return 0;
    case "qa-round":
      need(1);
      d.qaRound(a(0));
      return 0;
    case "qa-lock":
      need(1);
      d.qaLock(
        a(0),
        String(typeof opts.files === "string" ? opts.files : "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      );
      return 0;
    case "changelog":
      need(2);
      d.changelog(a(0), pos.slice(1).join(" "));
      return 0;
    case "merge":
      need(1);
      d.merge(a(0));
      return 0;
    case "cleanup":
      need(1);
      d.cleanup(a(0));
      return 0;
    case "model":
      need(1);
      d.model(a(0), pos[1]);
      return 0;
    case "next":
      need(1);
      d.next(a(0));
      return 0;
    case "stats":
      need(1);
      d.stats(a(0));
      return 0;
    case "status-md":
      d.statusMd(typeof opts.in === "string" ? opts.in : undefined);
      return 0;
    case "board":
      d.board();
      return 0;
  }
  out(USAGE);
  return 1;
}
