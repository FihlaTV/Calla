import { BaseRoutedSource } from "./BaseRoutedSource";

/**
 * A spatializer that uses Google's Resonance Audio library.
 **/
export class ResonanceSource extends BaseRoutedSource {

    /**
     * Creates a new spatializer that uses Google's Resonance Audio library.
     * @param {string} id
     * @param {MediaStream|HTMLAudioElement} stream
     * @param {AudioContext} audioContext
     * @param {import("../../../../lib/resonance-audio/src/resonance-audio").ResonanceAudio} res
     */
    constructor(id, stream, audioContext, res) {
        const resNode = res.createSource();
        super(id, stream, audioContext, resNode.input);

        this.inNode.disconnect(audioContext.destination);
        this.resScene = res;
        this.resNode = resNode;

        Object.seal(this);
    }

    /**
     * Performs the spatialization operation for the audio source's latest location.
     * @param {import("../../positions/Pose").Pose} loc
     */
    update(loc) {
        super.update(loc);
        const { p, f, u } = loc;
        this.resNode.setMinDistance(this.minDistance);
        this.resNode.setMaxDistance(this.maxDistance);
        this.resNode.setPosition(p.x, p.y, p.z);
        this.resNode.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
    }

    /**
     * Discard values and make this instance useless.
     */
    dispose() {
        this.resScene.removeSource(this.resNode);
        this.resNode = null;
        super.dispose();
    }
}