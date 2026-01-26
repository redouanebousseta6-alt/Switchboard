import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { SwitchboardImage } from '../editor/fabric/switchboard-image';
import { HistoryService } from './history/history.service';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private canvas: fabric.Canvas | null = null;
  private canvasWidth = 600; // The white "design area" size
  private canvasHeight = 1200;
  private workspaceWidth = 2000; // Infinite gray workspace
  private workspaceHeight = 3000;
  private canvasOffsetX = 700; // Center the white canvas in workspace
  private canvasOffsetY = 900;
  private clippingEnabled = true; // Toggle for content clipping
  private zoomLevel = 1; // Current zoom level (1 = 100%)
  private isPanning = false;
  private lastPosX = 0;
  private lastPosY = 0;
  private hoveredObject: any = null; // Track hover state
  private spacePressed = false; // Track space key state
  private shortcutsAttached = false;
  private isInternalOperation = false;
  private isHeadlessMode = false;

  constructor(private historyService: HistoryService) {}

  /**
   * Setup canvas specifically for headless rendering
   */
  setupHeadless(width: number, height: number) {
    this.isHeadlessMode = true;
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    if (this.canvas) {
      this.canvas.setDimensions({ width, height });
      // Use a slightly off-white background to distinguish the canvas from the page
      this.canvas.backgroundColor = '#F9FAFB';
    }
  }

  /**
   * Initialize Fabric.js canvas - Infinite workspace design engine
   */
  initCanvas(canvasId: string): fabric.Canvas {
    this.canvas = new fabric.Canvas(canvasId, {
      width: this.workspaceWidth,
      height: this.workspaceHeight,
      backgroundColor: '#F3F4F6',
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      controlsAboveOverlay: true,
      allowTouchScrolling: true,
    } as any);

    this.addCanvasFrame();
    this.applySelectionStyle();
    this.setupInteractionListeners();
    this.setupZoomAndPan();
    this.setupKeyboardShortcuts();

    // Save initial state
    setTimeout(() => this.saveHistory(), 500);

    // Center the design area and handle window resizing
    if (!this.shortcutsAttached) {
      window.addEventListener('resize', () => this.centerDesignArea());
    }
    
    setTimeout(() => {
      // Set default zoom to 40% only in editor mode (not headless/API mode)
      // The setZoom method will automatically center the canvas
      if (!this.isHeadlessMode) {
        this.setZoom(0.4);
      } else {
        // In headless mode, just center without zoom
        this.centerDesignArea();
      }
    }, 300);

    return this.canvas;
  }

  private addCanvasFrame() {
    if (!this.canvas) return;
    const canvasFrame = new fabric.Rect({
      left: this.canvasOffsetX,
      top: this.canvasOffsetY,
      width: this.canvasWidth,
      height: this.canvasHeight,
      fill: '#FFFFFF',
      selectable: false,
      evented: false,
      stroke: '#E5E7EB',
      strokeWidth: 2,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.1)',
        blur: 20,
        offsetX: 0,
        offsetY: 5,
      }),
    } as any);
    (canvasFrame as any).isCanvasFrame = true;
    (canvasFrame as any).name = 'Canvas Frame';
    this.canvas.add(canvasFrame);
    (this.canvas as any).sendObjectToBack(canvasFrame);
  }

  private clipboard: any = null;

  private setupKeyboardShortcuts(): void {
    if (this.shortcutsAttached) return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.canvas) return;

      // Handle Space for panning
      if (e.code === 'Space' && !this.spacePressed) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          this.spacePressed = true;
          this.canvas.defaultCursor = 'grab';
          this.canvas.selection = false;
          this.canvas.renderAll();
        }
      }

      const activeObject = this.canvas.getActiveObject();
      const isEditing = activeObject && (activeObject as any).isEditing;

      // Don't trigger shortcuts if user is typing in a textbox or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || isEditing) {
        return;
      }

      // Handle Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            this.copy();
            break;
          case 'v':
            this.paste();
            break;
          case 'z':
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
            e.preventDefault();
            break;
          case 'y':
            this.redo();
            e.preventDefault();
            break;
          case 'a':
            this.selectAll();
            e.preventDefault();
            break;
          case '=':
          case '+':
            this.setZoom(this.zoomLevel + 0.1);
            e.preventDefault();
            break;
          case '-':
            this.setZoom(this.zoomLevel - 0.1);
            e.preventDefault();
            break;
          case '0':
            this.resetZoomAndPan();
            e.preventDefault();
            break;
        }
        return;
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          this.removeSelectedObject();
          break;

        case 'ArrowLeft':
          if (activeObject) {
            activeObject.set('left', activeObject.left! - (e.shiftKey ? 10 : 1));
            activeObject.setCoords();
            this.canvas.requestRenderAll();
            e.preventDefault();
          }
          break;
        case 'ArrowRight':
          if (activeObject) {
            activeObject.set('left', activeObject.left! + (e.shiftKey ? 10 : 1));
            activeObject.setCoords();
            this.canvas.requestRenderAll();
            e.preventDefault();
          }
          break;
        case 'ArrowUp':
          if (activeObject) {
            activeObject.set('top', activeObject.top! - (e.shiftKey ? 10 : 1));
            activeObject.setCoords();
            this.canvas.requestRenderAll();
            e.preventDefault();
          }
          break;
        case 'ArrowDown':
          if (activeObject) {
            activeObject.set('top', activeObject.top! + (e.shiftKey ? 10 : 1));
            activeObject.setCoords();
            this.canvas.requestRenderAll();
            e.preventDefault();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
        if (this.canvas) {
          this.canvas.defaultCursor = 'default';
          this.canvas.selection = true;
          this.canvas.renderAll();
        }
      }
    });

    this.shortcutsAttached = true;
  }

  private copy(): void {
    if (!this.canvas) return;
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'switchboard-textbox') return;
      if (activeObject.type === 'active-selection') return;

      // Temporarily remove clipPath to avoid circular references during serialization
      const originalClipPath = activeObject.clipPath;
      (activeObject as any).clipPath = undefined;

      activeObject.clone().then((cloned: any) => {
        this.clipboard = cloned;
        // Restore original clipPath
        (activeObject as any).clipPath = originalClipPath;
        console.log('📋 Object copied');
      }).catch((err: any) => {
        console.error('❌ Copy failed:', err);
        (activeObject as any).clipPath = originalClipPath;
      });
    }
  }

  private paste(): void {
    if (!this.canvas || !this.clipboard) return;
    
    // We clone the clipboard object so we can paste multiple times
    // We don't necessarily need to clone the name since we want a new sequential one
    this.clipboard.clone(['isCanvasFrame', 'selectable', 'evented']).then((clonedObj: any) => {
      this.canvas!.discardActiveObject();
      
      // Assign a new simplified, sequential name for the pasted object (e.g., image-2)
      clonedObj.name = this.generateElementName(clonedObj);
      
      // Offset for visible difference
      clonedObj.set({
        left: clonedObj.left + 20,
        top: clonedObj.top + 20,
        evented: true,
      });

      // Re-apply the global design area clipPath
      if (this.clippingEnabled && !(clonedObj as any).isCanvasFrame) {
        clonedObj.clipPath = this.createCanvasClipPath();
      }
      
      this.canvas!.add(clonedObj);
      this.canvas!.setActiveObject(clonedObj);
      this.canvas!.requestRenderAll();
      console.log(`📋 Object pasted as: ${clonedObj.name}`);
    });
  }

  private selectAll(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    const objs = this.canvas.getObjects().filter(obj => !(obj as any).isCanvasFrame && !(obj as any).isAlignmentGuide);
    const sel = new fabric.ActiveSelection(objs, {
      canvas: this.canvas,
    });
    this.canvas.setActiveObject(sel);
    this.canvas.requestRenderAll();
  }

  private applySelectionStyle(): void {
    if (!this.canvas) return;
    const FabricObject = (fabric as any).Object || (fabric as any).FabricObject;
    if (FabricObject && FabricObject.prototype) {
      FabricObject.prototype.set({
        borderColor: '#2196f3',
        borderScaleFactor: 1,
        cornerColor: '#2196f3',
        cornerStrokeColor: '#2196f3',
        cornerStyle: 'rect',
        cornerSize: 8,
        transparentCorners: false,
        borderOpacityWhenMoving: 1,
        padding: 0,
      });
    }
  }

  private setupInteractionListeners(): void {
    if (!this.canvas) return;

    // Hover detection
    this.canvas.on('mouse:move', (opt: any) => {
      if (this.isPanning || !this.canvas) return;
      const target = this.canvas.findTarget(opt.e);
      const isCanvasFrame = (target as any)?.isCanvasFrame;
      
      if (target && !isCanvasFrame && target !== this.hoveredObject && !this.canvas.getActiveObject()) {
        if (this.hoveredObject) {
          this.hoveredObject.set({
            strokeWidth: this.hoveredObject._originalStrokeWidth || 0,
            stroke: this.hoveredObject._originalStroke || 'transparent',
            strokeDashArray: null
          });
        }
        this.hoveredObject = target;
        this.hoveredObject._originalStroke = target.stroke;
        this.hoveredObject._originalStrokeWidth = target.strokeWidth;
        this.hoveredObject.set({
          stroke: '#2196f3',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        this.canvas.renderAll();
      } else if (!target && this.hoveredObject) {
        this.hoveredObject.set({
          strokeWidth: this.hoveredObject._originalStrokeWidth || 0,
          stroke: this.hoveredObject._originalStroke || 'transparent',
          strokeDashArray: null,
        });
        this.hoveredObject = null;
        this.canvas.renderAll();
      }
    });

    // Global Pinning Guides (Switchboard Architecture)
    this.canvas.on('object:moving', (e: any) => this.renderPinningGuides(e.target));
    this.canvas.on('object:scaling', (e: any) => this.renderPinningGuides(e.target));
    this.canvas.on('object:modified', () => {
      this.clearPinningGuides();
      this.saveHistory();
    });
    this.canvas.on('object:added', (e: any) => {
      if (!e.target.isCanvasFrame && !e.target.isAlignmentGuide && !this.isInternalOperation) {
        this.saveHistory();
      }
    });
    this.canvas.on('object:removed', (e: any) => {
      if (!e.target.isCanvasFrame && !e.target.isAlignmentGuide && !this.isInternalOperation) {
        this.saveHistory();
      }
    });
    this.canvas.on('selection:cleared', () => this.clearPinningGuides());
  }

  private clearPinningGuides(): void {
    if (!this.canvas) return;
    const guides = this.canvas.getObjects().filter((o: any) => (o as any).isAlignmentGuide);
    this.canvas.remove(...guides);
    this.canvas.requestRenderAll();
  }

  private renderPinningGuides(obj: any): void {
    if (!this.canvas || !obj) return;
    this.clearPinningGuides();

    const frame = this.canvas.getObjects().find((o: any) => (o as any).isCanvasFrame);
    if (!frame) return;

    const bounds = obj.getBoundingRect();
    const frameBounds = frame.getBoundingRect();

    const drawGuide = (x1: number, y1: number, x2: number, y2: number, value: number) => {
      if (Math.abs(value) < 1) return;
      const line = new fabric.Line([x1, y1, x2, y2], {
        stroke: '#ff4d4f',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        strokeDashArray: [4, 4]
      });
      (line as any).isAlignmentGuide = true;

      const label = new fabric.Text(`${Math.abs(Math.round(value))}px`, {
        left: (x1 + x2) / 2,
        top: (y1 + y2) / 2,
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#ff4d4f',
        backgroundColor: 'white',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
        padding: 2
      });
      (label as any).isAlignmentGuide = true;
      this.canvas?.add(line, label);
    };

    const leftDist = bounds.left - frameBounds.left;
    const topDist = bounds.top - frameBounds.top;
    const rightDist = (frameBounds.left + frameBounds.width) - (bounds.left + bounds.width);
    const bottomDist = (frameBounds.top + frameBounds.height) - (bounds.top + bounds.height);

    drawGuide(frameBounds.left, bounds.top + bounds.height/2, bounds.left, bounds.top + bounds.height/2, leftDist);
    drawGuide(bounds.left + bounds.width/2, frameBounds.top, bounds.left + bounds.width/2, bounds.top, topDist);
    drawGuide(bounds.left + bounds.width, bounds.top + bounds.height/2, frameBounds.left + frameBounds.width, bounds.top + bounds.height/2, rightDist);
    drawGuide(bounds.left + bounds.width/2, bounds.top + bounds.height, bounds.left + bounds.width/2, frameBounds.top + frameBounds.height, bottomDist);

    this.canvas.requestRenderAll();
  }


  addObject(object: any): void {
    if (this.canvas) {
      // Assign a simplified name if not already set
      if (!object.name) {
        object.name = this.generateElementName(object);
      }

      const finalLeft = object.left + this.canvasOffsetX;
      const finalTop = object.top + this.canvasOffsetY;
      object.set({ left: finalLeft, top: finalTop });
      
      if (!(object as any).isCanvasFrame && !(object as any).isAlignmentGuide) {
        if (this.clippingEnabled) {
          object.clipPath = this.createCanvasClipPath();
        }
      }
      this.canvas.add(object);
      this.canvas.setActiveObject(object);
      this.canvas.renderAll();
    }
  }

  /**
   * Generates a simplified, sequential name for elements (e.g., text-1, image-2)
   */
  private generateElementName(object: any): string {
    const type = object.type;
    let baseName = 'element';
    
    if (type === 'rect') baseName = 'rect';
    else if (type === 'switchboard-image') baseName = 'image';
    else if (type === 'switchboard-textbox' || type === 'i-text' || type === 'text') baseName = 'text';
    
    const existingObjects = this.getObjects();
    let count = 1;
    
    // Find the next available number for this base name
    while (existingObjects.some(obj => obj.name === `${baseName}-${count}`)) {
      count++;
    }
    
    return `${baseName}-${count}`;
  }

  async addImage(url: string, options: any = {}): Promise<void> {
    if (!this.canvas) return;

    try {
      // Try to load image safely (with CORS fallback)
      const imgElement = await this.safeLoadImage(url);

      const img = new SwitchboardImage(imgElement, {
        left: 100,
        top: 100,
        width: 400,
        height: 300,
        src: url, // Pass the URL for serialization
        ...options
      });

      this.addObject(img);
    } catch (error) {
      console.error('Error adding image:', error);
    }
  }

  /**
   * Safe image loader that tries CORS first, then falls back to non-CORS
   */
  private async safeLoadImage(url: string): Promise<HTMLImageElement> {
    try {
      // 1. Try with CORS (allows exporting/toDataURL)
      return await fabric.util.loadImage(url, { crossOrigin: 'anonymous' });
    } catch (err) {
      console.warn(`⚠️ CORS load failed for ${url}, falling back to non-CORS.`);
      // 2. Try without CORS (image will show but might "taint" the canvas)
      return await fabric.util.loadImage(url);
    }
  }

  private createCanvasClipPath(): fabric.Rect {
    return new fabric.Rect({
      left: this.canvasOffsetX,
      top: this.canvasOffsetY,
      width: this.canvasWidth,
      height: this.canvasHeight,
      absolutePositioned: true,
    } as any);
  }

  getCanvas(): fabric.Canvas | null { return this.canvas; }
  getCanvasDimensions() { return { width: this.canvasWidth, height: this.canvasHeight }; }
  getCanvasFrameOffset() { return { x: this.canvasOffsetX, y: this.canvasOffsetY }; }
  
  removeSelectedObject(): void {
    if (this.canvas) {
      const activeObject = this.canvas.getActiveObject();
      if (activeObject) {
        this.canvas.remove(activeObject);
        this.canvas.renderAll();
      }
    }
  }

  setClippingEnabled(enabled: boolean): void {
    this.clippingEnabled = enabled;
    if (!this.canvas) return;
    this.canvas.getObjects().forEach((obj: any) => {
      if (!obj.isCanvasFrame && !obj.isAlignmentGuide) {
        obj.clipPath = enabled ? this.createCanvasClipPath() : null;
      }
    });
    this.canvas.renderAll();
  }

  isClippingEnabled() { return this.clippingEnabled; }

  private setupZoomAndPan(): void {
    if (!this.canvas) return;
    const canvasElement = this.canvas.getElement();
    
    canvasElement.parentElement?.addEventListener('wheel', (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY;
        let zoom = this.canvas!.getZoom();
        
        // Smoother zoom logic
        const factor = 0.999 ** delta;
        zoom *= factor;
        
        // Clamping zoom
        if (zoom > 5) zoom = 5;
        if (zoom < 0.05) zoom = 0.1;
        
        // Zoom to the mouse pointer position
        const pointer = this.canvas!.getPointer(e);
        this.canvas!.zoomToPoint(new fabric.Point(pointer.x, pointer.y), zoom);
        
        this.zoomLevel = zoom;
      }
    }, { passive: false });

    this.canvas.on('mouse:down', (opt: any) => {
      if (this.spacePressed || opt.e.button === 1) {
        this.isPanning = true;
        this.lastPosX = opt.e.clientX;
        this.lastPosY = opt.e.clientY;
      }
    });
    this.canvas.on('mouse:move', (opt: any) => {
      if (this.isPanning) {
        const vpt = this.canvas!.viewportTransform!;
        vpt[4] += opt.e.clientX - this.lastPosX;
        vpt[5] += opt.e.clientY - this.lastPosY;
        this.canvas!.requestRenderAll();
        this.lastPosX = opt.e.clientX;
        this.lastPosY = opt.e.clientY;
      }
    });
    this.canvas.on('mouse:up', () => { this.isPanning = false; });
  }

  setZoom(zoom: number) {
    if (!this.canvas) return;
    
    // Clamp zoom between 10% and 500%
    const newZoom = Math.max(0.1, Math.min(5, zoom));
    
    // Zoom to center of the canvas if zooming via buttons/keys
    const center = this.canvas.getVpCenter();
    this.canvas.zoomToPoint(new fabric.Point(center.x, center.y), newZoom);
    
    this.zoomLevel = newZoom;
    
    // Re-center the design area after zoom change (only in editor mode)
    if (!this.isHeadlessMode) {
      setTimeout(() => this.centerDesignArea(), 50);
    }
  }
  getZoom() { return this.zoomLevel; }
  resetZoomAndPan() {
    if (!this.canvas) return;
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.canvas.setZoom(1);
    this.zoomLevel = 1;
    this.centerDesignArea();
  }

  /**
   * Serialize canvas to JSON
   */
  async serialize(): Promise<any> {
    if (!this.canvas) return null;
    // Include custom properties like isCanvasFrame and name
    return this.canvas.toObject(['isCanvasFrame', 'name', 'selectable', 'evented']);
  }

  /**
   * Generate thumbnail data URL
   */
  async generateThumbnail(width: number = 300, height: number = 200): Promise<string> {
    if (!this.canvas) return '';
    
    // Find the canvas frame to zoom into it for the thumbnail
    const frame = this.canvas.getObjects().find((obj: any) => (obj as any).isCanvasFrame);
    
    if (!frame) {
      console.warn('⚠️ Canvas frame not found for export, exporting whole workspace');
      return this.canvas.toDataURL({ format: 'png', quality: 0.8, multiplier: 1 } as any);
    }

    // Capture the design area specifically
    return this.canvas.toDataURL({
      format: 'png',
      quality: 1, // Higher quality for export
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      multiplier: width / frame.width, // Scale to requested width
      enableRetinaScaling: false
    } as any);
  }

  centerDesignArea() {
    if (!this.canvas) return;
    
    // Use requestAnimationFrame to ensure container is fully rendered
    requestAnimationFrame(() => {
      if (!this.canvas) return;
      
      // Get the container dimensions
      const container = this.canvas.getElement().parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth || 800; // Fallback
      const containerHeight = container.clientHeight || 600;

      // Design area center in workspace coordinates
      const designCenter = {
        x: this.canvasOffsetX + this.canvasWidth / 2,
        y: this.canvasOffsetY + this.canvasHeight / 2
      };

      // Calculate the transform to center the design area
      // vpt[4] and vpt[5] are the pan offsets
      const zoom = this.canvas.getZoom();
      const vpt = this.canvas.viewportTransform!;
      
      if (vpt) {
        vpt[4] = (containerWidth / 2) - (designCenter.x * zoom);
        vpt[5] = (containerHeight / 2) - (designCenter.y * zoom);
        
        this.canvas.requestRenderAll();
        console.log('🎯 Canvas centered at zoom:', Math.round(zoom * 100) + '%');
      }
    });
  }

  /**
   * Load canvas from JSON
   */
  async loadFromJSON(json: any): Promise<void> {
    if (!this.canvas) return;
    
    try {
      // In Fabric 6, loadFromJSON is async. 
      // We wrap it to catch potential loading errors from broken image URLs
      await this.canvas.loadFromJSON(json);
      console.log('✅ JSON loaded into canvas');
    } catch (err) {
      console.warn('⚠️ Some assets failed to load during loadFromJSON, but continuing...', err);
    }

    // CRITICAL: We perform post-load adjustments even if some assets failed
    // (This ensures headless repositioning runs even if an image URL is broken)
    this.postLoadAdjustments();
    
    // Only center the design area in editor mode (not headless)
    if (!this.isHeadlessMode) {
      setTimeout(() => this.centerDesignArea(), 100);
    }
  }

  /**
   * Post-load adjustments: frame detection and headless viewport alignment
   */
  private postLoadAdjustments() {
    if (!this.canvas) return;

    const objects = this.canvas.getObjects();
    
    // 1. Find the canvas frame
    const frame = objects.find((obj: any) => 
      (obj as any).isCanvasFrame || 
      (obj as any).name === 'Canvas Frame' ||
      (obj.type === 'rect' && obj.fill === '#FFFFFF' && obj.selectable === false)
    );
    
    if (frame) {
      (frame as any).isCanvasFrame = true;
      (frame as any).selectable = false;
      (frame as any).evented = false;
      
      // 2. HEADLESS MODE: Align camera to frame instead of moving objects
      if (this.isHeadlessMode) {
        console.log(`🎥 Headless mode: Aligning camera to design frame at (${frame.left}, ${frame.top})`);
        
        // Calculate scale to fit the frame into our requested image size
        const scaleX = this.canvasWidth / frame.width;
        const scaleY = this.canvasHeight / frame.height;
        const scale = Math.min(scaleX, scaleY);
        
        // Update viewport transform to "look" exactly at the frame
        const vpt = this.canvas.viewportTransform!;
        vpt[0] = scale;
        vpt[3] = scale;
        vpt[4] = -frame.left * scale;
        vpt[5] = -frame.top * scale;

        console.log(`📏 Design scaled by ${scale.toFixed(2)}x to fill ${this.canvasWidth}x${this.canvasHeight}`);
        
        // Ensure all objects are visible (remove clipping that might be left over from editor)
        objects.forEach((obj: any) => {
          obj.clipPath = null;
        });
      } else {
        // Editor mode: update local state to match frame
        this.canvasWidth = frame.width || this.canvasWidth;
        this.canvasHeight = frame.height || this.canvasHeight;
        this.canvasOffsetX = frame.left || 0;
        this.canvasOffsetY = frame.top || 0;
      }
      
      this.canvas.sendObjectToBack(frame);
    }
    
    // 3. Clipping is handled by the frame alignment in headless
    if (this.clippingEnabled && !this.isHeadlessMode) {
      this.canvas.getObjects().forEach((obj: any) => {
        if (!(obj as any).isCanvasFrame && !(obj as any).isAlignmentGuide) {
          obj.clipPath = this.createCanvasClipPath();
        }
      });
    }
    
    this.canvas.renderAll();
  }

  /**
   * Get all objects on canvas
   */
  getObjects(): any[] {
    return this.canvas?.getObjects() || [];
  }

  /**
   * Clear canvas
   */
  clearCanvas(): void {
    if (this.canvas) {
      this.canvas.clear();
      this.canvas.backgroundColor = '#F3F4F6';
      this.canvas.renderAll();
    }
  }

  /**
   * Dispose canvas (cleanup)
   */
  disposeCanvas(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
  }

  /**
   * Set canvas dimensions
   */
  setCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    if (this.canvas) {
      // 1. Update the white background frame
      const frame = this.canvas.getObjects().find((obj: any) => obj.isCanvasFrame);
      if (frame) {
        frame.set({ width: this.canvasWidth, height: this.canvasHeight });
        frame.setCoords();
      }

      // 2. Re-apply clipping paths to all objects
      if (this.clippingEnabled) {
        this.canvas.getObjects().forEach((obj: any) => {
          if (!(obj as any).isCanvasFrame && !(obj as any).isAlignmentGuide) {
            obj.clipPath = this.createCanvasClipPath();
          }
        });
      }

      this.canvas.renderAll();
    }
  }

  /**
   * Apply overwrites from a Switchboard-style JSON payload
   */
  async applyOverwrites(overwrites: any): Promise<void> {
    if (!this.canvas || !overwrites) return;

    // Robustness: If overwrites is wrapped in an "elements" property, unwrap it
    // This handles common user error in API tools
    let finalOverwrites = overwrites;
    if (overwrites.elements && typeof overwrites.elements === 'object' && !overwrites.elements.type) {
      console.log('💡 Unwrapping nested "elements" property in overwrites');
      finalOverwrites = overwrites.elements;
    }

    const objects = this.canvas.getObjects();

    for (const [apiName, props] of Object.entries(finalOverwrites)) {
      // Find the object by its API name
      const targetObj = objects.find((obj: any) => obj.name === apiName) as any;
      if (!targetObj) {
        console.warn(`⚠️ Object with API name "${apiName}" not found on canvas`);
        continue;
      }

      const p = props as any;
      console.log(`🎨 Applying overwrites to [${apiName}]:`, p);

      // Handle Text properties
      if (p.text !== undefined && (targetObj.type === 'switchboard-textbox' || targetObj.type === 'i-text')) {
        if (targetObj.setText) {
          targetObj.setText(p.text);
        } else {
          targetObj.set('text', p.text);
        }
      }

      // Handle Colors
      if (p.fillColor !== undefined) {
        console.log(`  - Changing fill from ${targetObj.fill} to ${p.fillColor}`);
        targetObj.set({ fill: p.fillColor });
      }
      if (p.textColor !== undefined) {
        targetObj.set({ fill: p.textColor });
      }

      // Handle Image specific properties
      if (targetObj.type === 'switchboard-image') {
        if (p.url !== undefined) {
          try {
            const imgElement = await this.safeLoadImage(p.url);
            targetObj.setElement(imgElement);
            targetObj.src = p.url;
          } catch (err) {
            console.error(`❌ Failed to load image from URL: ${p.url}`, err);
          }
        }
        if (p.backgroundColor !== undefined) targetObj.set('imageBackgroundColor', p.backgroundColor);
        if (p.backgroundOpacity !== undefined) targetObj.set('imageBackgroundOpacity', p.backgroundOpacity);
        if (p.contain !== undefined) targetObj.set('contain', !!p.contain);
        if (p.horizontalAlignment !== undefined) targetObj.set('horizontalAlign', p.horizontalAlignment);
        if (p.verticalAlignment !== undefined) targetObj.set('verticalAlign', p.verticalAlignment);
      }

      // Handle Textbox specific properties
      if (targetObj.type === 'switchboard-textbox') {
        if (p.fillTextBox !== undefined) targetObj.setFillTextBox(!!p.fillTextBox);
        if (p.maximumFontSize !== undefined) targetObj.setMaxFontSize(p.maximumFontSize);
        if (p.horizontalAlignment !== undefined) targetObj.set('textAlign', p.horizontalAlignment);
        if (p.verticalAlignment !== undefined) targetObj.setVerticalAlign(p.verticalAlignment);
      }

      // Common transformations
      if (p.opacity !== undefined) targetObj.set('opacity', p.opacity);
      if (p.angle !== undefined) targetObj.set('angle', p.angle);

      targetObj.setCoords();
      targetObj.dirty = true;
    }

    this.canvas.renderAll();
    console.log('✅ Overwrites applied successfully');
  }

  /**
   * Helper method for intelligent text binary search
   * (Added to resolve compiler errors)
   */
  intelligentTextBinarySearch(textObject: any): void {
    if (!textObject || !textObject.fitTextToBox) return;
    textObject.fitTextToBox();
  }

  /**
   * Save canvas state to history service
   */
  private async saveHistory() {
    if (this.isInternalOperation || !this.canvas) return;
    const state = await this.serialize();
    this.historyService.saveState(JSON.stringify(state));
  }

  /**
   * Undo last operation
   */
  async undo() {
    if (!this.canvas) return;
    const currentState = await this.serialize();
    const previousState = this.historyService.undo(JSON.stringify(currentState));
    if (previousState) {
      this.isInternalOperation = true;
      await this.loadFromJSON(JSON.parse(previousState));
      this.isInternalOperation = false;
    }
  }

  /**
   * Redo last undone operation
   */
  async redo() {
    if (!this.canvas) return;
    const nextState = this.historyService.redo();
    if (nextState) {
      this.isInternalOperation = true;
      await this.loadFromJSON(JSON.parse(nextState));
      this.isInternalOperation = false;
    }
  }
}
