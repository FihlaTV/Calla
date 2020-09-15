import { Euler } from "../lib/three.js/src/math/Euler";
import { Quaternion } from "../lib/three.js/src/math/Quaternion";
import { Vector2 } from "../lib/three.js/src/math/Vector2";
import { Vector3 } from "../lib/three.js/src/math/Vector3";
import { EventBase } from "../calla/events/EventBase";
import { clamp } from "../calla/math/clamp";
import { MouseButtons } from "./MouseButton";


const NEUTRAL_POSITION_RESET_QUAT = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0));
const FLIP_IMAGE_QUAT = new Quaternion().setFromEuler(new Euler(0, 0, Math.PI));
const motion = new Vector2();

/// <summary>
/// The mouse is not as sensitive as the motion controllers, so we have to bump up the
/// sensitivity quite a bit.
/// </summary>
/** @type {number} */
const MOUSE_SENSITIVITY_SCALE = 100;

/// <summary>
/// The mouse is not as sensitive as the motion controllers, so we have to bump up the
/// sensitivity quite a bit.
/// </summary>
/** @type {Number} */
const TOUCH_SENSITIVITY_SCALE = 0.5;

const Mode = Object.freeze({
    None: "none",
    Auto: "auto",
    MouseLocked: "mouselocked",
    MouseUnlocked: "mouseunlocked",
    MouseScreenEdge: "mouseedge",
    Touch: "touchswipe",
    Gamepad: "gamepad",
    MagicWindow: "magicwindow",
    NetworkView: "net",
    WebXR: "xr"
});

const deltaEuler = new Euler();
const deltaQuat = new Quaternion();

class ModeChangeEvent extends Event {
    /**
     * @param {Mode} newMode
     * @param {Mode} oldMode
     */
    constructor(newMode, oldMode) {
        super("modechanged");

        this.newMode = newMode;
        this.oldMode = oldMode;

        Object.freeze(this);
    }
}

export class CameraControl extends EventBase {

    /**
     * @param {import("../lib/three.js").PerspectiveCamera} camera
     * @param {import("./Stage").Stage} stage
     * @param {import("./ScreenPointerControls").ScreenPointerControls} controls
     * @param {import("./CursorControl").CursorControl} cursors
     */
    constructor(camera, stage, controls, cursors) {
        super();

        this.camera = camera;
        this.stage = stage;
        this.controls = controls;
        this.cursors = cursors;

        /** @type {Mode} */
        this.controlMode = Mode.Auto;

        /** @type {Mode} */
        this.lastMode = Mode.None;

        /** @type {Map<Mode, MouseButtons>} */
        this.requiredMouseButton = new Map([
            [Mode.MouseLocked, MouseButtons.None],
            [Mode.MouseUnlocked, MouseButtons.Mouse0],
            [Mode.MouseScreenEdge, MouseButtons.None]
        ]);

        /** @type {Number} */
        this.requiredTouchCount = 1;

        /** @type {Number} */
        this.dragThreshold = 2;

        /** @type {Boolean} */
        this.disableHorizontal = false;

        /** @type {Boolean} */
        this.disableVertical = false;

        /** @type {Boolean} */
        this.invertHorizontal = false;

        /** @type {Boolean} */
        this.invertVertical = true;

        /// <summary>
        /// Minimum vertical value
        /// </summary>
        /** @type {Number} */
        this.minimumX = -85 * Math.PI / 180;

        /// <summary>
        /// Maximum vertical value
        /// </summary>
        /** @type {Number} */
        this.maximumX = 85 * Math.PI / 180;

        /** @type {Quaternion} */
        this.target = new Quaternion(0, 0, 0, 1);

        /** @type {PoseSerializable} */
        this._networkPose = null;

        /** @type {Quaternion} */
        this.lastGyro = new Quaternion(0, 0, 0, 1);

        this.edgeFactor = 1 / 3;
        this.accelerationX = 2;
        this.accelerationY = 2;
        this.speedX = 4;
        this.speedY = 3;

        this.fovZoomEnabled = true;
        this.minFOV = 25;
        this.maxFOV = 120;

        let lastT = performance.now();
        let lastEvt = null;
        const update = (evt) => {

            const t = performance.now();
            const dt = (t - lastT) / 1000;
            lastT = t;
            lastEvt = evt;

            if (evt.pointerType === "mouse") {
                if (this.cursors.isPointerLocked) {
                    this.controlMode = Mode.MouseScreenEdge;
                }
                else {
                    this.controlMode = Mode.MouseUnlocked;
                }
            }
            else if (evt.pointerType === "touch") {
                this.controlMode = Mode.Touch;
            }
            else if (evt.pointerType === "gamepad") {
                this.controlMode = Mode.Gamepad;
            }

            if (this.controlMode != this.lastMode) {
                this.dispatchEvent(new ModeChangeEvent(this.controlMode, this.lastMode));
                this.lastMode = this.controlMode;
            }

            if (this.controlMode != Mode.None) {
                this.checkMode(
                    this.controlMode,
                    this.controlMode === Mode.MagicWindow || this.disableVertical,
                    evt,
                    dt);
            }

            if (this.fovZoomEnabled
                && Math.abs(evt.dz) > 0) {
                this.fov = clamp(this.camera.fov - evt.dz, this.minFOV, this.maxFOV);
            }
        };

        this.update = () => {
            if (lastEvt
                && (this.controlMode === Mode.MouseScreenEdge
                    || this.controlMode === Mode.Gamepad)) {
                update(lastEvt);
            }
            else {
                lastT = performance.now();
            }
        };

        this.controls.addEventListener("click", update);
        this.controls.addEventListener("move", update);
    }

    get fov() {
        return this.camera.fov;
    }

    set fov(v) {
        if (v !== this.fov) {
            this.camera.fov = v;
            this.camera.updateProjectionMatrix();
        }
    }

    get networkPose() {
        return this._networkPose;
    }

    set networkPose(value) {
        this._networkPose = value;
        if (this._networkPose) {
            this.target = this._networkPose.Orientation;
        }
    }

    /**
     * @param {Mode} mode
     * @param {import("./ScreenPointerControls").ScreenPointerEvent} evt
     */
    pointerMovement(mode, evt) {
        switch (mode) {
            case Mode.MouseUnlocked:
            case Mode.MouseLocked:
            case Mode.Gamepad:
            case Mode.Touch:
                return this.getAxialMovement(evt);

            case Mode.MouseScreenEdge:
                return this.getRadiusMovement(evt);

            default:
                return motion.set(0, 0);
        }
    }

    /**
     * @param {import("./ScreenPointerControls").ScreenPointerEvent} evt
     */
    getAxialMovement(evt) {
        motion.set(
            -MOUSE_SENSITIVITY_SCALE * evt.du,
            MOUSE_SENSITIVITY_SCALE * evt.dv);

        return motion;
    }

    _scaleRadialComponent(n, dn, ddn) {
        const absN = Math.abs(n);
        return Math.sign(n) * Math.pow(Math.max(0, absN - this.edgeFactor) / (1 - this.edgeFactor), ddn) * dn;
    }

    /**
     * @param {import("./ScreenPointerControls").ScreenPointerEvent} evt
     */
    getRadiusMovement(evt) {
        motion.set(
            this._scaleRadialComponent(evt.u, this.speedX, this.accelerationX),
            this._scaleRadialComponent(-evt.v, this.speedY, this.accelerationY));

        return motion;
    }

    get meanTouchPointMovement() {
        motion.set(0, 0);
        let count = 0;
        for (const pointer of this.controls.pointers.values()) {
            if (pointer.type === "touch") {
                motion.x += pointer.x;
                motion.y += pointer.y;
                ++count;
            }
        }

        motion.set(
            TOUCH_SENSITIVITY_SCALE * motion.y / count,
            -TOUCH_SENSITIVITY_SCALE * motion.x / count);
        return motion;
    }

    /**
     * @param {Mode} mode
     * @param {Boolean} disableVertical
     * @param {import("./ScreenPointerControls").ScreenPointerEvent} evt
     * @param {Number} dt
     */
    orientationDelta(mode, disableVertical, evt, dt) {
        if (mode == Mode.MagicWindow
            || mode == Mode.NetworkView) {
            const endQuat = this.absoluteOrientation;
            const dRot = this.lastGyro.inverse().multiply(endQuat);
            this.lastGyro = endQuat;
            return dRot;
        }
        else {
            var move = this.pointerMovement(mode, evt);

            if (disableVertical) {
                move.x = 0;
            }
            else if (this.invertVertical) {
                move.x *= -1;
            }

            if (this.disableHorizontal) {
                move.y = 0;
            }
            else if (this.invertHorizontal) {
                move.y *= -1;
            }

            move.multiplyScalar(dt);
            deltaEuler.set(move.y, move.x, 0, "YXZ");
            deltaQuat.setFromEuler(deltaEuler);

            return deltaQuat;
        }
    }

    get absoluteOrientation() {
        if (this.controlMode == Mode.MagicWindow) {
            return NEUTRAL_POSITION_RESET_QUAT
                .multiply(UnityInput.gyro.attitude)
                .multiply(FLIP_IMAGE_QUAT);
        }
        else if (this.controlMode == Mode.NetworkView) {
            return new Quaternion().fromArray(this.networkPose.Orientation);
        }
        else {
            return new Quaternion(0, 0, 0, 1);
        }
    }

    /**
     * @param {Mode} mode
     * @param {import("./ScreenPointerControls").ScreenPointerEvent} evt
     */
    gestureSatisfied(mode, evt) {
        if (mode == Mode.Touch) {
            return this.controls.getPointerCount("touch") === this.requiredTouchCount;
        }
        else if (mode == Mode.NetworkView) {
            return this.networkPose !== null;
        }
        else if (this.requiredMouseButton.has(mode)) {
            return evt.buttons === this.requiredMouseButton.get(mode);
        }
        else {
            return mode == Mode.Gamepad
                || mode == Mode.MagicWindow
                || mode == Mode.WebXR;
        }
    }

    /**
     * @param {Mode} mode
     */
    dragRequired(mode) {
        return mode == Mode.Touch
            || !this.requiredMouseButton.has(mode)
            || this.requiredMouseButton.get(mode) != MouseButtons.None;
    }

    /**
     * @param {Mode} mode
     */
    dragSatisfied(mode, evt) {
        return !this.dragRequired(mode)
            || evt.dragDistance > this.dragThreshold;
    }

    /**
     * @param {Mode} mode
     * @param {Boolean} disableVertical
     * @param {import("./ScreenPointerControls").ScreenPointerEvent} evt
     * @param {Number} dt
     */
    checkMode(mode, disableVertical, evt, dt) {
        if (this.gestureSatisfied(mode, evt)
            && this.dragSatisfied(mode, evt)) {
            const dQuat = this.orientationDelta(mode, disableVertical, evt, dt);
            this.stage.rotateView(
                dQuat,
                this.minimumX,
                this.maximumX);
        }
    }
}

CameraControl.Mode = Mode;