import { TypedEvent, TypedEventBase } from "../events/EventBase";
import type { CanvasTypes, Context2D } from "../html/canvas";
export interface PaddingRect {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
interface TextImageEvents {
    redrawn: TypedEvent<"redrawn">;
}
export declare class TextImage extends TypedEventBase<TextImageEvents> {
    private _minWidth;
    private _maxWidth;
    private _minHeight;
    private _maxHeight;
    private _strokeColor;
    private _strokeSize;
    private _bgColor;
    private _value;
    private _scale;
    private _fillColor;
    private _textDirection;
    private _wrapWords;
    private _fontStyle;
    private _fontVariant;
    private _fontWeight;
    private _fontFamily;
    private _fontSize;
    private _padding;
    private _canvas;
    private _g;
    constructor();
    loadFontAndSetText(value?: string | null): Promise<void>;
    get scale(): number;
    set scale(v: number);
    get minWidth(): number | null;
    set minWidth(v: number | null);
    get maxWidth(): number | null;
    set maxWidth(v: number | null);
    get minHeight(): number | null;
    set minHeight(v: number | null);
    get maxHeight(): number | null;
    set maxHeight(v: number | null);
    get canvas(): CanvasTypes;
    get width(): number;
    get height(): number;
    get padding(): PaddingRect;
    set padding(v: PaddingRect);
    get wrapWords(): boolean;
    set wrapWords(v: boolean);
    get textDirection(): string;
    set textDirection(v: string);
    get fontStyle(): string;
    set fontStyle(v: string);
    get fontVariant(): string;
    set fontVariant(v: string);
    get fontWeight(): string;
    set fontWeight(v: string);
    get fontSize(): number;
    set fontSize(v: number);
    get fontFamily(): string;
    set fontFamily(v: string);
    get fillColor(): string;
    set fillColor(v: string);
    get strokeColor(): string | null;
    set strokeColor(v: string | null);
    get strokeSize(): number | null;
    set strokeSize(v: number | null);
    get bgColor(): string | null;
    set bgColor(v: string | null);
    get value(): string | null;
    set value(v: string | null);
    draw(g: Context2D, x: number, y: number): void;
    private split;
    private redraw;
}
export {};