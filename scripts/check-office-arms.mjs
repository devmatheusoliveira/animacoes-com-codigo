import assert from "node:assert/strict";
import { Box3, Euler, Vector3 } from "three";
import {
  ARM_LENGTHS,
  getCharacterPose,
  TORSO_PIVOT,
  DESK_POSITION,
  CHAIR_POSITION,
} from "../src/OfficeScene/CharacterRig.ts";

const smooth = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
let maxContactError = 0;
let maxElbowStep = 0;
let maxElbowFrame = 0;
let previous;
const deskTop = new Box3(
  new Vector3(
    DESK_POSITION[0] - 1.75,
    (1.17 - 0.09) * 0.82,
    DESK_POSITION[2] - 0.75,
  ),
  new Vector3(
    DESK_POSITION[0] + 1.75,
    (1.17 + 0.09) * 0.82,
    DESK_POSITION[2] + 0.75,
  ),
);
let minClearance = Infinity;
const chairBack = new Box3(
  new Vector3(-0.515, -0.47, -0.115),
  new Vector3(0.515, 0.47, 0.115),
);
for (let frame = 0; frame < 360; frame++) {
  const seconds = frame / 30;
  const pose = getCharacterPose(seconds, smooth((seconds - 8.2) / 1.4));
  const root = new Vector3(
    -4.25 + 6.5 * pose.progress,
    pose.rootY + Math.abs(Math.sin(pose.phase)) * 0.022 * pose.walk,
    pose.rootZ,
  );
  const yaw = pose.yaw;
  const toWorld = (point) =>
    point
      .clone()
      .sub(new Vector3(0, TORSO_PIVOT, 0))
      .applyEuler(
        new Euler(pose.lean, 0, Math.sin(pose.phase) * 0.014 * pose.walk),
      )
      .add(new Vector3(0, TORSO_PIVOT, 0))
      .applyAxisAngle(new Vector3(0, 1, 0), yaw)
      .add(root);
  for (const key of ["leftArm", "rightArm"]) {
    const arm = pose[key];
    assert.ok(
      Math.abs(arm.shoulder.distanceTo(arm.elbow) - ARM_LENGTHS.upper) < 1e-10,
    );
    for (const [a, b, radius] of [
      [arm.shoulder, arm.elbow, 0.094],
      [arm.elbow, arm.wrist, 0.073],
      [arm.wrist, arm.wrist, 0.093],
    ]) {
      const start = toWorld(a),
        end = toWorld(b);
      for (let sample = 0; sample <= 80; sample++) {
        const point = start.clone().lerp(end, sample / 80);
        const clearance =
          point.distanceTo(deskTop.clampPoint(point, new Vector3())) - radius;
        minClearance = Math.min(minClearance, clearance);
        assert.ok(
          clearance >= 0.001,
          `Desk collision: frame ${frame}, ${key}, radius ${radius}, gap ${clearance.toFixed(6)}`,
        );
        if (seconds >= 5.8) {
          const chairLocal = point
            .clone()
            .sub(new Vector3(CHAIR_POSITION[0], 0.78, CHAIR_POSITION[2]))
            .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI)
            .applyAxisAngle(new Vector3(1, 0, 0), 0.1);
          const chairGap =
            chairLocal.distanceTo(
              chairBack.clampPoint(chairLocal, new Vector3()),
            ) - radius;
          assert.ok(
            chairGap > 0,
            `Chair back collision at frame ${frame}, ${key}, gap ${chairGap}`,
          );
        }
      }
    }
    assert.ok(
      Math.abs(arm.elbow.distanceTo(arm.wrist) - ARM_LENGTHS.forearm) < 1e-10,
    );
    assert.ok(
      [...arm.elbow.toArray(), ...arm.wrist.toArray()].every(Number.isFinite),
    );
    if (previous) {
      const step = toWorld(arm.elbow).distanceTo(previous[key]);
      if (step > maxElbowStep) {
        maxElbowStep = step;
        maxElbowFrame = frame;
      }
    }
  }
  // The sweater must not lean into the tabletop either.
  for (let row = 0; row <= 36; row++) {
    const phi = (row * Math.PI) / 36;
    for (let col = 0; col < 48; col++) {
      const theta = (col * Math.PI * 2) / 48;
      const surface = toWorld(
        new Vector3(
          0.35 * Math.sin(phi) * Math.cos(theta),
          1.36 + 0.46 * Math.cos(phi),
          0.235 * Math.sin(phi) * Math.sin(theta),
        ),
      );
      assert.ok(
        !deskTop.containsPoint(surface),
        `Torso intersects desk at frame ${frame}`,
      );
    }
  }
  if (pose.action > 0.999) {
    maxContactError = Math.max(
      maxContactError,
      pose.rightArm.wrist.distanceTo(pose.rightArm.target),
    );
  }
  previous = {
    leftArm: toWorld(pose.leftArm.elbow),
    rightArm: toWorld(pose.rightArm.elbow),
  };
}
assert.ok(maxContactError < 0.015, `Lid contact error: ${maxContactError}`);
// Includes the character's walking translation, not only arm articulation.
assert.ok(
  maxElbowStep < 0.1,
  `Elbow discontinuity: ${maxElbowStep}, frame ${maxElbowFrame}`,
);
console.log(
  `360 frames: equal fixed arm lengths; contact error ${maxContactError.toFixed(6)}; elbow step ${maxElbowStep.toFixed(6)}; minimum desk clearance ${minClearance.toFixed(6)}`,
);
