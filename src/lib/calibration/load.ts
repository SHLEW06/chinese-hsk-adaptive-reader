import type { CalibrationState } from "@/types/calibration";
import { normalizeCalibrationState } from "./state";

/**
 * Load-time classification of persisted calibration data.
 *
 * Why this exists: an older client must never read a document written by a
 * *newer* schema, "repair" it into an empty not-started state, and then save
 * that emptiness over the learner's real data. Loads therefore distinguish:
 *
 *  - "absent":             no calibration was ever stored — writable.
 *  - "valid":              well-formed current-version state — writable.
 *  - "malformed":          claims the current version (or no recognizable
 *                          version at all) but is structurally broken;
 *                          repaired to a safe state — writable, because the
 *                          original carries no recoverable meaning.
 *  - "unsupportedVersion": a well-identified *future* schema version. The
 *                          payload is meaningful to a newer client, so this
 *                          client must treat it as read-only and refuse every
 *                          calibration write until the app is updated.
 */
export type CalibrationLoadResult =
  | { kind: "absent"; state: CalibrationState }
  | { kind: "valid"; state: CalibrationState }
  | { kind: "malformed"; state: CalibrationState }
  | { kind: "unsupportedVersion"; schemaVersion: number };

export class UnsupportedCalibrationSchemaError extends Error {
  readonly schemaVersion: number;

  constructor(schemaVersion: number) {
    super(
      `Calibration data uses unsupported schema version ${schemaVersion}; ` +
        "refusing to overwrite data written by a newer client.",
    );
    this.name = "UnsupportedCalibrationSchemaError";
    this.schemaVersion = schemaVersion;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const VALID_STATUSES = new Set(["notStarted", "inProgress", "completed"]);

export function classifyCalibrationState(raw: unknown): CalibrationLoadResult {
  if (raw === null || raw === undefined) {
    return { kind: "absent", state: normalizeCalibrationState(null) };
  }
  if (!isRecord(raw)) {
    return { kind: "malformed", state: normalizeCalibrationState(null) };
  }
  const version = raw.schemaVersion;
  // A well-identified future version is the only case treated as unsupported;
  // everything else unrecognizable is malformed *current* data. Keeping the
  // two distinct matters: malformed data has no meaning to recover, while a
  // future version is perfectly meaningful — just not to this client.
  if (typeof version === "number" && Number.isInteger(version) && version > 1) {
    return { kind: "unsupportedVersion", schemaVersion: version };
  }
  if (
    version === 1 &&
    typeof raw.status === "string" &&
    VALID_STATUSES.has(raw.status) &&
    isRecord(raw.results) &&
    isRecord(raw.baseline)
  ) {
    return { kind: "valid", state: normalizeCalibrationState(raw) };
  }
  return { kind: "malformed", state: normalizeCalibrationState(raw) };
}

/**
 * Guard for every calibration write path: throws when the data already in
 * storage was written by a newer schema. Storage implementations call this
 * with the raw existing payload immediately before replacing it.
 */
export function assertCalibrationOverwriteSafe(existingRaw: unknown): void {
  const load = classifyCalibrationState(existingRaw);
  if (load.kind === "unsupportedVersion") {
    throw new UnsupportedCalibrationSchemaError(load.schemaVersion);
  }
}

/**
 * Combine the cloud document with the per-user local checkpoint written after
 * every answer. An unsupported future-version cloud document always wins —
 * an older local checkpoint must never resurface as writable state that
 * could later replace it. Otherwise the newer of the two (by `updatedAt`)
 * wins, with the cloud taking ties; only a fully *valid* checkpoint is ever
 * trusted over the cloud copy.
 */
export function resolveCalibrationLoad(
  cloudRaw: unknown,
  checkpointRaw: unknown,
): CalibrationLoadResult {
  const cloud = classifyCalibrationState(cloudRaw);
  if (cloud.kind === "unsupportedVersion") return cloud;
  const checkpoint = classifyCalibrationState(checkpointRaw);
  if (checkpoint.kind !== "valid") return cloud;
  const cloudUpdatedAt = cloud.state.updatedAt ?? "";
  const checkpointUpdatedAt = checkpoint.state.updatedAt ?? "";
  return checkpointUpdatedAt > cloudUpdatedAt ? checkpoint : cloud;
}
