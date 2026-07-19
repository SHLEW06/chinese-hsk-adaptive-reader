import { describe, expect, it } from "vitest";

import { SerialTaskQueue } from "./serialTaskQueue";

describe("SerialTaskQueue", () => {
  it("completes same-key writes in invocation order", async () => {
    const queue = new SerialTaskQueue();
    const completed: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.run("user", async () => {
      await firstGate;
      completed.push("older");
    });
    const second = queue.run("user", async () => {
      completed.push("newer");
    });

    await Promise.resolve();
    expect(completed).toEqual([]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(completed).toEqual(["older", "newer"]);
  });

  it("continues after a rejected write", async () => {
    const queue = new SerialTaskQueue();
    const failed = queue.run("user", async () => {
      throw new Error("write failed");
    });
    const next = queue.run("user", async () => "saved");

    await expect(failed).rejects.toThrow("write failed");
    await expect(next).resolves.toBe("saved");
  });

  it("an older slow write can never land after a newer full-document write", async () => {
    const queue = new SerialTaskQueue();
    let stored = "";
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    // Rapid consecutive answers: the first (older) write stalls on the
    // network while newer full-document states queue up behind it.
    const first = queue.run("user", async () => {
      await firstGate;
      stored = "answers:1";
    });
    const second = queue.run("user", async () => {
      stored = "answers:1,2";
    });
    const third = queue.run("user", async () => {
      stored = "answers:1,2,3";
    });

    releaseFirst();
    await Promise.all([first, second, third]);
    expect(stored).toBe("answers:1,2,3");
  });

  it("a rejected write is not swallowed and later writes restore the full state", async () => {
    const queue = new SerialTaskQueue();
    let stored = "answers:1";
    const rejected = queue.run("user", async () => {
      throw new Error("transient network failure");
    });
    const recovered = queue.run("user", async () => {
      stored = "answers:1,2,3";
    });

    // The rejection surfaces to the caller (never silently dropped)…
    await expect(rejected).rejects.toThrow("transient network failure");
    await recovered;
    // …and the next full-document write carries the missing answers too.
    expect(stored).toBe("answers:1,2,3");
  });
});
