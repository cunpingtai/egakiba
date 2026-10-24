import type { ShapeFeatures } from '../../game-core/src/types.ts';

/** Versioned input to a shape analyzer. V1 hand-drawn PNG records are raster-only. */
export interface DrawingSource {
  schemaVersion: 2;
  width: 1024;
  height: 1024;
  mimeType: 'image/png';
  /** SHA-256 of the RGBA pixels, independent of PNG encoder metadata. */
  sourceHash: string;
}

/** Later versions can store stroke commands without breaking raster-only legacy art. */
export interface StrokePoint { x: number; y: number; pressure?: number; }
export interface Stroke { tool: 'pen'|'eraser'; color: string; size: number; points: StrokePoint[]; }
export interface DrawingDocument extends DrawingSource {
  optionalStrokes?: Stroke[];
  /** Raster fill/erase actions are represented in saved PNG until vector ops are shipped. */
  rasterCanonical: true;
}
export interface Joint2D { x: number; y: number; parent: number; radius: number; }
export interface FighterBlueprint {
  schemaVersion: 1;
  analyzerVersion: string;
  balanceVersion: string;
  sourceHash: string;
  joints: Joint2D[];
  features: ShapeFeatures;
  combatHull: Array<{x:number;y:number}>;
}

/**
 * R1 extraction currently returns the original analyzer's `par`-based joints.
 * Normalization into FighterBlueprint.combatHull remains an R2 gate; the
 * game-core already uses bounded ShapeFeatures-derived competitive stats.
 */
export interface LegacyJoint2D { x: number; y: number; par: number; rad: number; }
