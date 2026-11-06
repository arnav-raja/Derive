import { readFileSync } from "node:fs";
import path from "node:path";

import * as esbuild from "esbuild";
import { init, parse } from "es-module-lexer";
import { createElement, Fragment, useId, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { routeOf } from "@/server/handler";
import { matchRoute } from "@/server/routes";
import { clientReference as reference, registerAction } from "@/server/wire/refs";
import { encode, newRenderState } from "@/server/wire/render";

import { clientModules, decodeValue, encodeValue, type WireValue } from "./codec";

vi.mock("@/lib/wire/client", () => ({ serverAction: (id: string) => ({ id }) }));

const ROOT = path.resolve(import.meta.dirname, "../../..");

describe("the wire format", () => {
  it("carries what JSON cannot, and back", () => {
    const value = {
      none: undefined,
      notANumber: Number.NaN,
      negativeZero: -0,
      big: 12n,
      when: new Date("2026-11-06T10:00:00.000Z"),
      map: new Map([["a", 1]]),
      set: new Set([1, 2]),
      // An object of the learner's own with the tag key still arrives as written.
      tagged: { $w: "e", t: "script" },
      list: [1, "two", null],
    };
    const wire = JSON.parse(JSON.stringify(encodeValue(value))) as WireValue;
    const back = decodeValue(wire) as typeof value;
    expect(back.none).toBeUndefined();
    expect("none" in back).toBe(true);
    expect(back.notANumber).toBeNaN();
    expect(Object.is(back.negativeZero, -0)).toBe(true);
    expect(back.big).toBe(12n);
    expect(back.when.toISOString()).toBe("2026-11-06T10:00:00.000Z");
    expect(back.map.get("a")).toBe(1);
    expect([...back.set]).toEqual([1, 2]);
    expect(back.tagged).toEqual({ $w: "e", t: "script" });
    expect(back.list).toEqual([1, "two", null]);
  });

  it("refuses functions in plain data", () => {
    expect(() => encodeValue({ f: () => 1 })).toThrow(/function/);
  });
});

/** A client component reference, typed as a component that takes any props. */
const clientReference = (id: string) => reference(id) as unknown as (props: Record<string, unknown>) => null;

describe("the server's renderer", () => {
  it("calls server components and keeps client components as references", async () => {
    const Card = clientReference("src/components/card.tsx#Card");
    const save = async (n: number) => n;
    registerAction(save, "src/server/app/test/actions.ts#save");
    function Heading({ name }: { name: string }) {
      const id = useId();
      return createElement("h1", { id }, `Hello ${name}`);
    }
    async function Page({ name }: { name: string }) {
      await Promise.resolve();
      return createElement(
        Fragment,
        null,
        createElement(Heading, { name }),
        createElement(Card, { onSave: save.bind(null, 3), when: new Date(0) }),
      );
    }
    const wire = await encode(createElement(Page, { name: "Arnav" }), "test", newRenderState());
    expect([...clientModules(wire)]).toEqual(["src/components/card.tsx"]);
    const text = JSON.stringify(wire);
    expect(text).toContain("Hello Arnav");
    expect(text).toContain('"$w":"a","id":"src/server/app/test/actions.ts#save","b":[3]');
  });

  it("names the component that uses a hook only the browser may", async () => {
    function Counter() {
      useState(0);
      return null;
    }
    await expect(encode(createElement(Counter), "test", newRenderState())).rejects.toThrow(/Counter calls useState/);
  });

  it("refuses to send a plain function to the browser", async () => {
    const Card = clientReference("src/components/card.tsx#Card");
    await expect(encode(createElement(Card, { onClick: () => 1 }), "test", newRenderState())).rejects.toThrow(
      /only server actions and client components/,
    );
  });
});

describe("the server's addresses", () => {
  it("strips the base the server answers under", () => {
    expect(routeOf("/functions/v1/derive-api/page")).toBe("/page");
    expect(routeOf("/Derive/_derive/api/tutor/hint")).toBe("/api/tutor/hint");
    expect(routeOf("/_derive")).toBe("/");
  });

  it("matches every page with its parameters", () => {
    expect(matchRoute("/lessons/M1.1/explore")?.params).toEqual({ code: "M1.1", phase: "explore" });
    expect(matchRoute("/lessons/M1.1")?.params).toEqual({ code: "M1.1" });
    expect(matchRoute("/today")?.route.pattern).toBe("/today");
    expect(matchRoute("/nowhere")).toBeNull();
  });
});

describe("the actions client components call", () => {
  it("each names an export of a module marked use server", async () => {
    const { ACTION_IDS } = await import("@/lib/actions");
    await init;
    expect(ACTION_IDS.length).toBeGreaterThan(0);
    for (const id of ACTION_IDS) {
      const [file, name] = id.split("#") as [string, string];
      const source = readFileSync(path.join(ROOT, file), "utf8");
      expect(source.trimStart().startsWith('"use server"'), `${file} is marked "use server"`).toBe(true);
      const js = await esbuild.transform(source, { loader: "ts", format: "esm" });
      const [, exports] = parse(js.code);
      expect(exports.map((e) => e.n), `${file} exports ${name}`).toContain(name);
    }
  });
});
