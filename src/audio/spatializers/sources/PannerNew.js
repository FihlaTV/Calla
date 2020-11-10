import { PannerBase } from "./PannerBase";

/**
 * A positioner that uses WebAudio's playback dependent time progression.
 **/
export class PannerNew extends PannerBase {

    /**
     * Creates a new positioner that uses WebAudio's playback dependent time progression.
     * @param {string} id
     * @param {MediaStream|HTMLAudioElement} stream
     * @param {AudioContext} audioContext
     */
    constructor(id, stream, audioContext) {
        super(id, stream, audioContext);

        Object.seal(this);
    }

    /**
     * Performs the spatialization operation for the audio source's latest location.
     * @param {import("../../positions/Pose").Pose} loc
     */
    update(loc) {
        super.update(loc);
        const { p, f } = loc;
        this.inNode.positionX.setValueAtTime(p.x, 0);
        this.inNode.positionY.setValueAtTime(p.y, 0);
        this.inNode.positionZ.setValueAtTime(p.z, 0);
        this.inNode.orientationX.setValueAtTime(f.x, 0);
        this.inNode.orientationY.setValueAtTime(f.y, 0);
        this.inNode.orientationZ.setValueAtTime(f.z, 0);
    }
}

