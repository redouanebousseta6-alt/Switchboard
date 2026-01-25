import * as fabric from 'fabric';

/**
 * SwitchboardImage - A custom Fabric.js Image class that behaves as a container.
 * It supports "Cover" (fill) and "Contain" modes with alignment controls.
 */
export class SwitchboardImage extends fabric.FabricImage {
  static override type = 'switchboard-image';

  // Custom properties
  public name?: string;
  public horizontalAlign: 'left' | 'center' | 'right' = 'center';
  public verticalAlign: 'top' | 'middle' | 'bottom' = 'middle';
  public contain: boolean = false; // false = Cover (Fill), true = Contain
  public imageBackgroundColor: string = 'transparent';
  public imageBackgroundOpacity: number = 1;
  public override src: string = '';

  constructor(element: HTMLImageElement | HTMLCanvasElement, options?: any) {
    super(element, {
      ...options
    });

    // Initialize custom properties
    if (options) {
      this.name = options.name; // Preserve name
      this.horizontalAlign = options.horizontalAlign || 'center';
      this.verticalAlign = options.verticalAlign || 'middle';
      this.contain = !!options.contain;
      this.imageBackgroundColor = options.imageBackgroundColor || 'transparent';
      this.imageBackgroundOpacity = options.imageBackgroundOpacity ?? 1;
      this.src = options.src || (element as any).src || '';
    }

    // Set up live resize listener
    const self = this as any;
    self.on('scaling', (e: any) => this._onScaling(e));
  }

  // Identity
  override get type() { return 'switchboard-image'; }
  override set type(value: string) { }

  /**
   * Custom scaling logic to transform scale handles into container size changes
   * without stretching the image itself (the crop/fit is recalculated in _render).
   */
  private _onScaling(e: any): void {
    const newWidth = this.width * this.scaleX;
    const newHeight = this.height * this.scaleY;

    this.set({
      width: newWidth,
      height: newHeight,
      scaleX: 1,
      scaleY: 1
    });

    this.dirty = true;
  }

  /**
   * Override _render to implement the Cover/Contain logic.
   * Instead of Fabric's default image rendering, we manually calculate 
   * source/destination rectangles to maintain aspect ratio within the container.
   */
  override _render(ctx: CanvasRenderingContext2D): void {
    const element = this.getElement();
    if (!element) return;

    const width = this.width;
    const height = this.height;
    const imgWidth = element.width;
    const imgHeight = element.height;

    if (!imgWidth || !imgHeight) return;

    // 1. Draw background color if needed (especially for "Contain" mode)
    if (this.imageBackgroundColor !== 'transparent') {
      ctx.save();
      ctx.globalAlpha = this.imageBackgroundOpacity * (this.opacity || 1);
      ctx.fillStyle = this.imageBackgroundColor;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.restore();
    }

    const containerRatio = width / height;
    const imageRatio = imgWidth / imgHeight;

    let drawWidth, drawHeight, drawX, drawY;
    let sWidth, sHeight, sX, sY;

    if (this.contain) {
      // CONTAIN mode: Fit image entirely within container, show background in gaps.
      if (imageRatio > containerRatio) {
        drawWidth = width;
        drawHeight = width / imageRatio;
      } else {
        drawHeight = height;
        drawWidth = height * imageRatio;
      }

      sX = 0;
      sY = 0;
      sWidth = imgWidth;
      sHeight = imgHeight;

      // Calculate draw position within container based on alignment
      drawX = this._getAlignOffset(this.horizontalAlign, width, drawWidth);
      drawY = this._getAlignOffset(this.verticalAlign, height, drawHeight);
    } else {
      // COVER mode: Fill the container completely, crop the excess image parts.
      if (imageRatio > containerRatio) {
        // Image is wider than container
        sHeight = imgHeight;
        sWidth = imgHeight * containerRatio;
      } else {
        // Image is taller than container
        sWidth = imgWidth;
        sHeight = imgWidth / containerRatio;
      }

      // Calculate which part of the source image to crop based on alignment
      sX = this._getSourceOffset(this.horizontalAlign, imgWidth, sWidth);
      sY = this._getSourceOffset(this.verticalAlign, imgHeight, sHeight);

      // In Cover mode, we always draw to the full container size
      drawX = -width / 2;
      drawY = -height / 2;
      drawWidth = width;
      drawHeight = height;
    }

    ctx.drawImage(
      element,
      sX, sY, sWidth, sHeight,
      drawX, drawY, drawWidth, drawHeight
    );
  }

  private _getAlignOffset(align: string, containerSize: number, contentSize: number): number {
    const base = -containerSize / 2;
    if (align === 'center' || align === 'middle') return base + (containerSize - contentSize) / 2;
    if (align === 'right' || align === 'bottom') return base + (containerSize - contentSize);
    return base; // left or top
  }

  private _getSourceOffset(align: string, imgSize: number, sourceSize: number): number {
    if (align === 'center' || align === 'middle') return (imgSize - sourceSize) / 2;
    if (align === 'right' || align === 'bottom') return imgSize - sourceSize;
    return 0; // left or top
  }

  override toObject(propertiesToInclude?: any): any {
    return {
      ...super.toObject(propertiesToInclude),
      horizontalAlign: this.horizontalAlign,
      verticalAlign: this.verticalAlign,
      contain: this.contain,
      imageBackgroundColor: this.imageBackgroundColor,
      imageBackgroundOpacity: this.imageBackgroundOpacity,
      src: this.src,
      type: 'switchboard-image'
    };
  }

  /**
   * Override setElement to ensure that when a new image is loaded, 
   * we preserve the current container dimensions instead of resetting 
   * to the new image's natural size. This is key for the "Intelligent Image Box" behavior.
   */
  override setElement(element: HTMLImageElement | HTMLCanvasElement): this {
    const originalWidth = this.width;
    const originalHeight = this.height;
    
    super.setElement(element);
    
    // Restore the container dimensions
    this.set({
      width: originalWidth,
      height: originalHeight
    });
    
    return this;
  }

  /**
   * Async deserialization for Fabric.js
   */
  static override async fromObject(object: any): Promise<SwitchboardImage> {
    try {
      // 1. In headless mode, if the source is a blob URL, we use a transparent 1x1 pixel 
      // as a temporary placeholder so the object maintains its type and position.
      if (object.src && object.src.startsWith('blob:') && (window as any).renderComplete !== undefined) {
        console.log(`ℹ️ Skipping blob URL in headless: ${object.src}`);
        const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        const img = await (fabric as any).FabricImage.fromURL(transparentPixel);
        return new SwitchboardImage(img.getElement(), object);
      }

      // 2. Robust image loading for headless environments
      const img = await (fabric as any).FabricImage.fromURL(object.src, {
        crossOrigin: 'anonymous'
      });
      return new SwitchboardImage(img.getElement(), object);
    } catch (err) {
      console.error(`❌ SwitchboardImage failed to load: ${object.src}`, err);
      // Return a transparent SwitchboardImage as a placeholder so the layout and type doesn't break
      const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const dummyImg = new Image();
      dummyImg.src = transparentPixel;
      return new SwitchboardImage(dummyImg, object);
    }
  }
}

// Register with Fabric
if ((fabric as any).classRegistry) {
  (fabric as any).classRegistry.setClass(SwitchboardImage, 'switchboard-image');
}
