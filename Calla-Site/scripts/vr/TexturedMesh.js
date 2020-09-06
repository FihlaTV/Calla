import { Mesh, Texture } from "three";
import { isString, once } from "../calla";
import { height, src, width } from "../html/attrs";
import { Canvas, Img } from "../html/tags";
import { getFileWithProgress } from "./fetching";

export class TexturedMesh extends Mesh {
    /**
     * @param {import("three").BufferGeometry} geom
     * @param {import("three").Material} mat
     */
    constructor(geom, mat) {
        super(geom, mat);
        this.isVideo = false;
    }

    /**
     *
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|string|Texture} img
     */

    async setImage(img) {
        if (isString(img)) {
            img = await getFileWithProgress(img);
            img = Img(src(img));
        }

        if (img instanceof HTMLImageElement) {
            if (!img.complete) {
                await once(img, "load", "error", 10000);
            }

            // Force the image to be power-of-2 dimensioned.
            const w = Math.pow(2, Math.floor(Math.log2(img.width))),
                h = Math.pow(2, Math.floor(Math.log2(img.height))),
                canv = Canvas(
                    width(w),
                    height(h)),
                g = canv.getContext("2d");
            g.drawImage(img, 0, 0, img.width, img.height, 0, 0, w, h);

            img = canv;
        }

        if (!(img instanceof Texture)) {
            img = new Texture(img);
        }

        this.material.map = img;
        img = this.material.map.image;
        this.isVideo = img instanceof HTMLVideoElement;
        this.updateTexture();
    }

    updateTexture() {
        if (this.material && this.material.map) {
            this.material.map.needsUpdate = true;
        }
    }

    update() {
        if (this.isVideo) {
            this.updateTexture();
        }
    }
}
