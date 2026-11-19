import { describe, expect, it } from "vitest";
import {
  FOOTER_LINE_COUNT,
  actionForKey,
  browserCommand,
  consumeLocalUrl,
  hyperlink,
  linksFor,
  renderFooter,
  stripAnsi,
} from "./dev-console-ui.mjs";

describe("stripAnsi", () => {
  it("drops color and keeps the text", () => {
    expect(stripAnsi("\u001b[32mLocal:\u001b[0m http://localhost:3000")).toBe(
      "Local: http://localhost:3000",
    );
  });
});

describe("consumeLocalUrl", () => {
  it("reads a colored Local url and ignores the network url", () => {
    const chunk =
      "\u001b[32m- Local:\u001b[0m         http://localhost:3000\n- Network:       http://192.168.1.8:3000\n";
    expect(consumeLocalUrl("", chunk)).toEqual({ url: "http://localhost:3000", carry: "" });
  });

  it("keeps the port Next fell back to", () => {
    const chunk = "Port 3000 is in use, trying 3001 instead.\n- Local: http://localhost:3001\n";
    expect(consumeLocalUrl("", chunk).url).toBe("http://localhost:3001");
  });

  it("joins a url split across chunks", () => {
    const first = consumeLocalUrl("", "\u001b[32m- Local:");
    expect(first.url).toBeNull();
    const second = consumeLocalUrl(first.carry, "\u001b[0m http://localhost:3010\n");
    expect(second.url).toBe("http://localhost:3010");
  });
});

describe("linksFor", () => {
  it("builds the three app links from the origin", () => {
    expect(linksFor("http://localhost:3000/")).toEqual([
      { key: "p", label: "preview", url: "http://localhost:3000/fr" },
      { key: "l", label: "login", url: "http://localhost:3000/fr/login" },
      { key: "d", label: "dashboard", url: "http://localhost:3000/fr/dashboard" },
    ]);
  });
});

describe("hyperlink", () => {
  it("wraps the label in an OSC 8 link", () => {
    expect(hyperlink("http://localhost:3000/fr", "http://localhost:3000/fr")).toBe(
      "\u001b]8;;http://localhost:3000/fr\u0007http://localhost:3000/fr\u001b]8;;\u0007",
    );
  });
});

describe("renderFooter", () => {
  it("shows starting until an origin exists", () => {
    const footer = renderFooter({ origin: null, columns: 80, color: false });
    expect(footer).toContain("starting");
    expect(footer).not.toContain("http://");
    expect(footer.split("\n").filter((line) => line.length > 0)).toHaveLength(FOOTER_LINE_COUNT);
  });

  it("prints the three links and hyperlinks them", () => {
    const footer = renderFooter({ origin: "http://localhost:3000", columns: 140, color: false });
    expect(footer).toContain("http://localhost:3000/fr/login");
    expect(footer).toContain("http://localhost:3000/fr/dashboard");
    expect(footer).toContain("\u001b]8;;http://localhost:3000/fr\u0007");
  });

  it("skips color when color is off", () => {
    const plain = renderFooter({ origin: "http://localhost:3000", columns: 80, color: false });
    const colored = renderFooter({ origin: "http://localhost:3000", columns: 80, color: true });
    expect(plain).not.toMatch(/\u001b\[/);
    expect(colored).toContain("\u001b[31m");
    expect(colored).toContain("\u001b]8;;http://localhost:3000/fr\u0007");
  });

  it("keeps each line within the terminal width", () => {
    const footer = renderFooter({ origin: "http://localhost:3000", columns: 40, color: true });
    for (const line of footer.split("\n").filter((item) => item.length > 0)) {
      expect(stripAnsi(line).length).toBeLessThanOrEqual(39);
    }
  });
});

describe("actionForKey", () => {
  it("quits on q and ctrl-c even before the server is ready", () => {
    expect(actionForKey("q", null)).toEqual({ type: "quit" });
    expect(actionForKey("\u0003", null)).toEqual({ type: "quit" });
  });

  it("ignores preview keys until the origin is known", () => {
    expect(actionForKey("p", null)).toEqual({ type: "ignore" });
    expect(actionForKey("l", null)).toEqual({ type: "ignore" });
    expect(actionForKey("d", null)).toEqual({ type: "ignore" });
  });

  it("opens the matching link", () => {
    expect(actionForKey("p", "http://localhost:3000")).toEqual({
      type: "open",
      url: "http://localhost:3000/fr",
    });
    expect(actionForKey("l", "http://localhost:3000")).toEqual({
      type: "open",
      url: "http://localhost:3000/fr/login",
    });
    expect(actionForKey("d", "http://localhost:3000")).toEqual({
      type: "open",
      url: "http://localhost:3000/fr/dashboard",
    });
  });

  it("ignores other keys", () => {
    expect(actionForKey("x", "http://localhost:3000")).toEqual({ type: "ignore" });
  });
});

describe("browserCommand", () => {
  it("picks the platform opener", () => {
    expect(browserCommand("linux", "http://localhost:3000/fr")).toEqual({
      command: "xdg-open",
      args: ["http://localhost:3000/fr"],
    });
    expect(browserCommand("darwin", "http://localhost:3000/fr").command).toBe("open");
    expect(browserCommand("win32", "http://localhost:3000/fr")).toEqual({
      command: "cmd",
      args: ["/c", "start", "", "http://localhost:3000/fr"],
    });
  });
});
