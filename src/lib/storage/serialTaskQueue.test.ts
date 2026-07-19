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
});
