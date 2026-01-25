import * as fabric from 'fabric';

/**
 * SwitchboardTextbox - A refined custom Fabric.js Textbox
 */
export class SwitchboardTextbox extends fabric.Textbox {
  static override type = 'switchboard-textbox';

  // Custom properties
  public name?: string;
  public fixedWidth: number = 300;
  public fixedHeight: number = 150;
  public fillTextBox: boolean = true;
  public maxFontSize: number = 72;
  public verticalAlign: 'top' | 'middle' | 'bottom' = 'middle';
  public letterSpacing: number = 0;
  public lineSpacing: number = 1;
  public strokeColor: string = 'transparent';
  public strokeWidthValue: number = 0;
  
  private _fittingInProgress = false;
  private _fitTimeout: any = null;

  constructor(text: string, options?: any) {
    super(text, {
      lockScalingY: false, // Enable vertical scaling handles
      ...options
    });

    // Set defaults if not provided in options
    this.textAlign = options?.textAlign || 'center';
    this.fill = options?.fill || '#000000';

    // Initialize custom properties
    if (options) {
      this.name = options.name; // Preserve name
      this.fixedWidth = options.fixedWidth || options.width || 300;
      this.fixedHeight = options.fixedHeight || options.height || 150;
      this.fillTextBox = options.fillTextBox !== undefined ? !!options.fillTextBox : true;
      this.maxFontSize = options.maxFontSize || 72;
      this.verticalAlign = options.verticalAlign || 'middle';
      this.letterSpacing = options.letterSpacing || 0;
      this.lineSpacing = options.lineSpacing || 1;
      this.strokeColor = options.strokeColor || options.stroke || 'transparent';
      this.strokeWidthValue = options.strokeWidthValue || options.strokeWidth || 0;
    }

    // Force initial dimensions
    this.width = this.fixedWidth;
    this.height = this.fixedHeight;

    // Show all 8 handles (standard Textbox hides some)
    this.setControlsVisibility({
      mt: true, mb: true, ml: true, mr: true,
      bl: true, br: true, tl: true, tr: true,
      mtr: true
    });

    this.initDimensions();
    
    if (this.fillTextBox) {
      this.fitTextToBox();
    }

    // Event listeners
    const self = this as any;
    
    // Live resize feedback
    self.on('scaling', (e: any) => this._onScaling(e));
    
    self.on('changed', () => {
      if (this.fillTextBox && this.isEditing) {
        if (this._fitTimeout) clearTimeout(this._fitTimeout);
        this._fitTimeout = setTimeout(() => {
          this.fitTextToBox();
          this.canvas?.renderAll();
        }, 50); // Faster feedback during typing
      }
    });
    
    self.on('editing:exited', () => {
      this.width = this.fixedWidth;
      this.height = this.fixedHeight;
      if (this.fillTextBox) this.fitTextToBox();
      this.canvas?.renderAll();
    });
  }

  // Identity
  override get type() { return 'switchboard-textbox'; }
  override set type(value: string) { }

  /**
   * Override initDimensions to strictly honor the fixedWidth and fixedHeight
   */
  override initDimensions(): void {
    super.initDimensions();
    // In "Switchboard" mode, the bounding box IS the fixed container
    this.width = this.fixedWidth;
    this.height = this.fixedHeight;
  }

  /**
   * Custom scaling logic to transform scale into width/height changes
   * without stretching the text content.
   */
  private _onScaling(e: any): void {
    const transform = this.canvas?._currentTransform as any;
    if (!transform) return;

    // Calculate new physical dimensions
    const newWidth = this.width * this.scaleX;
    const newHeight = this.height * this.scaleY;

    // Apply to fixed properties
    this.fixedWidth = newWidth;
    this.fixedHeight = newHeight;

    // Update width/height and reset scale
    this.set({
      width: newWidth,
      height: newHeight,
      scaleX: 1,
      scaleY: 1
    });

    // Immediate auto-fit if enabled
    if (this.fillTextBox) {
      this.fitTextToBox();
    }

    this.dirty = true;
  }

  /**
   * Vertically centers the text by overriding the internal offset calculation.
   * This is better than context translation because it also aligns the cursor.
   */
  override _getTopOffset(): number {
    const textHeight = this.calcTextHeight();
    const baseTop = -this.height / 2;
    
    if (this.verticalAlign === 'middle') {
      return baseTop + (this.fixedHeight - textHeight) / 2;
    } else if (this.verticalAlign === 'bottom') {
      return baseTop + (this.fixedHeight - textHeight);
    }
    return baseTop; // top
  }

  /**
   * Binary search for optimal font size
   */
  fitTextToBox(): void {
    if (!this.fillTextBox || this._fittingInProgress) return;
    
    if (!this.text || this.text.trim() === '') {
      this.fontSize = Math.min(24, this.maxFontSize);
      this.initDimensions();
      return;
    }

    this._fittingInProgress = true;
    const selectionStart = this.selectionStart;
    const selectionEnd = this.selectionEnd;

    let minFS = 4;
    let maxFS = this.maxFontSize;
    let bestFS = minFS;

    // 15 iterations is usually enough for pixel-perfect results
    for (let i = 0; i < 15 && minFS <= maxFS; i++) {
      const midFS = Math.floor((minFS + maxFS) / 2);
      this.fontSize = midFS;
      this.width = this.fixedWidth;
      super.initDimensions(); // Call base to update text lines
      
      if (this.calcTextHeight() <= this.fixedHeight + 1) {
        bestFS = midFS;
        minFS = midFS + 1;
      } else {
        maxFS = midFS - 1;
      }
    }

    this.fontSize = bestFS;
    this.width = this.fixedWidth;
    this.initDimensions(); // Set final container size

    if (this.isEditing && selectionStart !== undefined) {
      this.selectionStart = Math.min(selectionStart, this.text.length);
      this.selectionEnd = Math.min(selectionEnd || selectionStart, this.text.length);
    }

    this._fittingInProgress = false;
    this.dirty = true;
  }

  // Property setters
  setText(value: string): void {
    this.text = value;
    if (this.fillTextBox && !this._fittingInProgress && !this.isEditing) {
      this.fitTextToBox();
    }
  }

  setLetterSpacing(value: number): void {
    this.letterSpacing = value;
    this.charSpacing = value * 10;
    this.dirty = true;
    if (this.fillTextBox) this.fitTextToBox();
  }

  setLineSpacing(value: number): void {
    this.lineSpacing = value;
    this.lineHeight = value;
    this.dirty = true;
    if (this.fillTextBox) this.fitTextToBox();
  }

  setFillTextBox(enabled: boolean): void {
    this.fillTextBox = enabled;
    if (enabled) this.fitTextToBox();
    this.dirty = true;
  }

  setMaxFontSize(size: number): void {
    this.maxFontSize = size;
    if (this.fillTextBox) this.fitTextToBox();
    this.dirty = true;
  }

  setVerticalAlign(align: 'top' | 'middle' | 'bottom'): void {
    this.verticalAlign = align;
    this.dirty = true;
  }

  setStrokeColor(color: string): void {
    this.strokeColor = color;
    this.set('stroke', color);
    this.dirty = true;
  }

  setStrokeWidth(width: number): void {
    this.strokeWidthValue = width;
    this.set('strokeWidth', width);
    this.dirty = true;
  }

  override toObject(propertiesToInclude?: any): any {
    return {
      ...super.toObject(propertiesToInclude),
      fixedWidth: this.fixedWidth,
      fixedHeight: this.fixedHeight,
      fillTextBox: this.fillTextBox,
      maxFontSize: this.maxFontSize,
      verticalAlign: this.verticalAlign,
      letterSpacing: this.letterSpacing,
      lineSpacing: this.lineSpacing,
      strokeColor: this.strokeColor,
      strokeWidthValue: this.strokeWidthValue,
      type: 'switchboard-textbox'
    };
  }

  static override fromObject(object: any): Promise<any> {
    return Promise.resolve(new SwitchboardTextbox(object.text || '', object));
  }
}

if ((fabric as any).classRegistry) {
  (fabric as any).classRegistry.setClass(SwitchboardTextbox, 'switchboard-textbox');
}
