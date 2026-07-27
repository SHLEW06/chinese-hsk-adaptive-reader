import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "chinese-adaptive-reader-rules-test";
const OWNER_ID = "owner-user";
const OTHER_ID = "other-user";

let testEnv: RulesTestEnvironment;

function emulatorAddress() {
  const value = process.env.FIRESTORE_EMULATOR_HOST;
  if (!value) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is missing. Run this suite with npm run test:rules.",
    );
  }
  const [host, rawPort] = value.split(":");
  return { host, port: Number(rawPort) };
}

beforeAll(async () => {
  const { host, port } = emulatorAddress();
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

function ownerDb() {
  return testEnv.authenticatedContext(OWNER_ID).firestore();
}

function otherDb() {
  return testEnv.authenticatedContext(OTHER_ID).firestore();
}

function guestDb() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

describe("Firestore ownership boundaries", () => {
  it("lets an owner read and write a valid saved word", async () => {
    const ref = doc(ownerDb(), `users/${OWNER_ID}/savedWords/word-1`);
    await assertSucceeds(
      setDoc(ref, {
        simplified: "学习",
        pinyin: "xué xí",
        definitions: ["to study"],
        status: "new",
      }),
    );
    await assertSucceeds(getDoc(ref));
  });

  it("denies guest and cross-user access", async () => {
    const path = `users/${OWNER_ID}/savedWords/word-1`;
    await seed(path, {
      simplified: "学习",
      pinyin: "xué xí",
      definitions: ["to study"],
      status: "new",
    });

    await assertFails(getDoc(doc(guestDb(), path)));
    await assertFails(getDoc(doc(otherDb(), path)));
    await assertFails(
      setDoc(doc(otherDb(), path), {
        simplified: "学习",
        pinyin: "xué xí",
        definitions: ["to study"],
        status: "known",
      }),
    );
  });

  it("rejects malformed saved words", async () => {
    const ref = doc(ownerDb(), `users/${OWNER_ID}/savedWords/word-1`);
    await assertFails(
      setDoc(ref, {
        simplified: "学习",
        pinyin: "xué xí",
        definitions: ["to study"],
        status: "invalid",
      }),
    );
    await assertFails(
      setDoc(ref, {
        simplified: "x".repeat(51),
        pinyin: "xué xí",
        definitions: ["to study"],
        status: "new",
      }),
    );
  });

  it("keeps unused user roots and unexpected singleton ids closed", async () => {
    await assertFails(
      setDoc(doc(ownerDb(), `users/${OWNER_ID}`), { arbitrary: true }),
    );
    await assertFails(
      setDoc(doc(ownerDb(), `users/${OWNER_ID}/profile/extra`), {
        hskLevel: 3,
      }),
    );
    await assertFails(
      setDoc(doc(ownerDb(), `users/${OWNER_ID}/calibration/extra`), {
        schemaVersion: 1,
        status: "notStarted",
      }),
    );
  });

  it("allows only the supported calibration document and schema", async () => {
    const ref = doc(ownerDb(), `users/${OWNER_ID}/calibration/main`);
    await assertSucceeds(
      setDoc(ref, { schemaVersion: 1, status: "inProgress" }),
    );
    await assertFails(
      setDoc(ref, { schemaVersion: 2, status: "inProgress" }),
    );
    await assertFails(
      setDoc(ref, { schemaVersion: 1, status: "unknown" }),
    );
  });
});

describe("Firestore append-only and internal collections", () => {
  it("keeps placement results and reading events append-only", async () => {
    const placement = doc(
      ownerDb(),
      `users/${OWNER_ID}/placementResults/result-1`,
    );
    const reading = doc(
      ownerDb(),
      `users/${OWNER_ID}/readingEvents/event-1`,
    );

    await assertSucceeds(setDoc(placement, { hskLevel: 3 }));
    await assertFails(updateDoc(placement, { hskLevel: 4 }));
    await assertFails(deleteDoc(placement));

    await assertSucceeds(
      setDoc(reading, { id: "reading-1", title: "Test", date: "2026-07-27" }),
    );
    await assertFails(updateDoc(reading, { title: "Changed" }));
    await assertFails(deleteDoc(reading));
  });

  it("denies client access to function-owned and unknown collections", async () => {
    await seed("sentenceExplanations/cache-key", { translation: "test" });
    await seed("rateLimits/owner-user", { calls: [] });

    await assertFails(
      getDoc(doc(ownerDb(), "sentenceExplanations/cache-key")),
    );
    await assertFails(
      setDoc(doc(ownerDb(), "rateLimits/owner-user"), { calls: [] }),
    );
    await assertFails(
      setDoc(doc(ownerDb(), `users/${OWNER_ID}/unexpected/doc-1`), {
        arbitrary: true,
      }),
    );
  });
});
