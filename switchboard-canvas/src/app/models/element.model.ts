/**
 * Element Models - Based on Switchboard JSON structure
 */

// Position object structure for each edge (top, bottom, left, right)
export interface ElementPosition {
  element: string | null; // UUID of element to pin to, or null for canvas edge
  elementEdge: string | null; // Which edge of target element ('top', 'bottom', 'left', 'right')
  pinned: boolean; // Is this edge pinned
  pc: number; // Percentage value
  px: number; // Pixel value
}

// Font object structure
export interface ElementFont {
  fontSize: number;
  fontFamily: {
    credentialId: string | null;
    file: string | null;
  };
}

// Padding object structure
export interface ElementPadding {
  x: number;
  y: number;
}

// Base element interface - common properties for all element types
export interface BaseElement {
  id: string; // UUID
  name: string; // API Name
  type: 'rectangle' | 'text' | 'image' | 'qr-code';
  order: number; // Z-index
  
  // Position objects for each edge
  top: ElementPosition;
  bottom: ElementPosition;
  left: ElementPosition;
  right: ElementPosition;
  
  // Size and transform
  width: { pc: number; px: number };
  height: { pc: number; px: number };
  angle: number; // Rotation in degrees
  radius: number; // Corner radius in pixels
  opacity: number; // 0-1
  
  // Visibility
  defaultVisibility: boolean;
  visibilityChangeX: number;
  visibilityChangeY: number;
}

// Rectangle-specific element
export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  rectangleBackgroundColor: string; // Hex color
  rectangleBackgroundTransparent: boolean;
  rectangleStrokeColor: string; // Hex color
  rectangleStrokeWidth: number; // In pixels
}

// Text-specific element
export interface TextElement extends BaseElement {
  type: 'text';
  text: string; // Content
  color: string; // Text color (hex)
  textHighlightColor: string;
  textBackgroundColor: string;
  textBackgroundHeight: number;
  textBackgroundPadding: number;
  textLetterSpacing: number;
  textLineSpacing: number;
  textStrategy: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  fillTextBox: boolean; // Auto-fit text engine
  maxFontSize: number;
  padding: ElementPadding;
  rotation: number;
  font: ElementFont;
}

// Image-specific element
export interface ImageElement extends BaseElement {
  type: 'image';
  url: string; // Image URL or blob reference
  lut: string | null;
  qrCode: string | null;
  horizontalAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  useSmartFocus: boolean;
  contain: boolean;
  imageSvgFill: boolean;
  imageSvgFillColor: string;
  imageStrokeColor: string;
  imageStrokeWidth: number;
  imageBackgroundColor: string;
  imageBackgroundOpacity: number;
  imageForegroundColor: string;
  imageForegroundOpacity: number;
  drawAngle: number;
}

// Template structure
export interface Template {
  id: string;
  displayName: string;
  apiName: string;
  createdDate: string;
  createdBy: string;
  thumbnailUrl: string | null;
  configuration: {
    template: {
      id: string;
      name: string;
      backgroundColor: string;
      backgroundOpacity: number;
      defaultWidth: number;
      defaultHeight: number;
    };
    // Elements keyed by UUID
    [key: string]: BaseElement | RectangleElement | TextElement | ImageElement | any;
  };
}

// Union type for all element types
export type CanvasElement = RectangleElement | TextElement | ImageElement;
