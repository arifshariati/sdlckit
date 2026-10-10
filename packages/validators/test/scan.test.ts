import { describe, expect, it } from "vitest";
import { parseDenylist, scanText } from "../src/scan.js";

describe("scanText", () => {
  it("returns no hits for clean text", () => {
    expect(scanText("Use the reviewer agent before merging.")).toEqual([]);
  });

  it("allows example and anthropic email domains", () => {
    expect(
      scanText("Contact noreply@anthropic.com or dev@example.com"),
    ).toEqual([]);
  });

  it("flags a personal email on the right line", () => {
    const hits = scanText("line one\nmail me at someone@gmail.com");
    expect(hits).toEqual([
      { rule: "email", match: "someone@gmail.com", line: 2 },
    ]);
  });

  it("flags Windows and Linux home paths", () => {
    expect(scanText("C:\\Users\\dev\\repo").map((h) => h.rule)).toContain(
      "machine-path",
    );
    expect(scanText("/home/dev/repo").map((h) => h.rule)).toContain(
      "machine-path",
    );
  });

  it("flags a 12-digit AWS account id", () => {
    expect(scanText("account 123456789012").map((h) => h.rule)).toContain(
      "aws-account-id",
    );
  });

  it("does not flag short numbers", () => {
    expect(scanText("port 3000 and 12345678901")).toEqual([]);
  });
});

describe("parseDenylist", () => {
  it("ignores blank lines and comments", () => {
    const terms = parseDenylist("# private terms\nalpha\n\n  beta  \n");
    expect(terms).toEqual(["alpha", "beta"]);
  });
});
