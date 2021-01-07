import { BaseWebAudioPanner } from "./BaseWebAudioPanner";
/**
 * A positioner that uses WebAudio's playback dependent time progression.
 **/
export class WebAudioPannerNew extends BaseWebAudioPanner {
    /**
     * Creates a new positioner that uses WebAudio's playback dependent time progression.
     */
    constructor(id, source, audioContext, destination) {
        super(id, source, audioContext, destination);
        Object.seal(this);
    }
    /**
     * Performs the spatialization operation for the audio source's latest location.
     */
    update(loc, t) {
        const { p, f } = loc;
        this.node.positionX.setValueAtTime(p[0], t);
        this.node.positionY.setValueAtTime(p[1], t);
        this.node.positionZ.setValueAtTime(p[2], t);
        this.node.orientationX.setValueAtTime(-f[0], t);
        this.node.orientationY.setValueAtTime(-f[1], t);
        this.node.orientationZ.setValueAtTime(-f[2], t);
    }
}
//# sourceMappingURL=WebAudioPannerNew.js.map