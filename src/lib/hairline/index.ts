// Types for Hairline figures (see the hairline-create skill). Each story's figure lives in
// src/mysteries/<slug>/art.ts as `define(HL, hairline)`: the figure file's body, verbatim, so the
// skill's build/validate/look tooling still runs on it (scripts/art.py wraps and unwraps it).

export type Point = [number, number];

export type FigureHandle = { set(value: number): void; destroy(): void };

export type FigureDecl = {
  name: string;
  /** One sentence: what the figure shows. Used as the stage's aria-label. */
  means: string;
  rules: number[];
  /** The slider's number at intensity 0, 0.5, 1; the middle one is the default. */
  range: [number, number, number];
  /** Stops for the unseen pointer when the figure idles, or null. */
  tour: (Point | null)[] | null;
  mount(ctx: { stage: HTMLElement; svg: SVGSVGElement; read: { textContent: string } }, value: number): FigureHandle;
};

/** The kernel surface the host uses. Figures take what they need from HL themselves. */
export type HairlineKernel = {
  inject(root: Document): void;
  mk(tag: string, attrs: Record<string, string>, parent: Element): SVGSVGElement;
  tour(stage: HTMLElement, stops: (Point | null)[], onStop?: (i: number) => void): { stop(): void };
  LAP: (Point | null)[];
};

export type FigureDefine = (HL: HairlineKernel, hairline: (decl: FigureDecl) => void) => void;

/** Runs a figure's body and returns what it declared with `hairline({...})`. */
export function declare(HL: HairlineKernel, define: FigureDefine): FigureDecl {
  let decl: FigureDecl | null = null;
  define(HL, (d) => {
    decl = d;
  });
  if (!decl) throw new Error("Hairline figure never called hairline({...})");
  return decl;
}
