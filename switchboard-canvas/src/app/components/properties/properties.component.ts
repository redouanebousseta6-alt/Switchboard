import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as fabric from 'fabric';
import { CanvasService } from '../../services/canvas.service';

import { ColorPickerComponent } from '../color-picker/color-picker.component';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ColorPickerComponent],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.css'
})
export class PropertiesComponent implements OnInit, OnDestroy {
  @Output() openFontLibrary = new EventEmitter<void>();
  
  selectedObject: any = null;
  propertiesForm: FormGroup;
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private canvasService: CanvasService
  ) {
    // Initialize form with all properties (rectangle + text + switchboard text)
    this.propertiesForm = this.fb.group({
      // Common properties
      name: [''],
      left: [0],
      top: [0],
      width: [0],
      height: [0],
      angle: [0],
      opacity: [100],
      
      // Canvas Properties
      canvasWidth: [600],
      canvasHeight: [1200],
      
      // Rectangle-specific
      radius: [0],
      fill: ['#3B82F6'],
      stroke: ['#000000'],
      strokeWidth: [0],
      
      // Text-specific
      textContent: [''],
      fontSize: [24],
      fontFamily: ['Arial'],
      textColor: ['#000000'],
      textAlign: ['center'],
      fontWeight: ['normal'],
      fontStyle: ['normal'],
      
      // Switchboard Textbox-specific
      fillTextBox: [false],
      maxFontSize: [72],
      verticalAlign: ['middle'],
      letterSpacing: [0],
      lineSpacing: [1.16],
      textTransform: ['none'],
      strokeColor: ['transparent'],
      strokeWidthValue: [0],

      // Shadow (shared across rect + text)
      shadowColor: ['#000000'],
      shadowOffsetX: [0],
      shadowOffsetY: [0],
      shadowBlur: [0],

      // Switchboard Image-specific
      horizontalAlign: ['center'],
      verticalAlignImage: ['middle'],
      contain: [false],
      imageBackgroundColor: ['transparent'],
      imageBackgroundOpacity: [100],
    });
  }

  ngOnInit() {
    // Wait for canvas to be initialized (same delay as Editor component)
    setTimeout(() => {
      this.setupCanvasListeners();
      
      // Initialize canvas dimensions in form
      const dims = this.canvasService.getCanvasDimensions();
      this.propertiesForm.patchValue({
        canvasWidth: dims.width,
        canvasHeight: dims.height
      }, { emitEvent: false });
    }, 150);

    // Listen to form changes and update canvas
    const formSub = this.propertiesForm.valueChanges.subscribe((values) => {
      if (this.selectedObject) {
        this.updateObjectFromForm(values);
      } else {
        // Update canvas dimensions - only if values are valid
        if (values.canvasWidth && values.canvasHeight && values.canvasWidth > 0 && values.canvasHeight > 0) {
          this.canvasService.setCanvasDimensions(values.canvasWidth, values.canvasHeight);
        }
      }
    });
    this.subscriptions.push(formSub);
  }

  private setupCanvasListeners() {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) {
      console.warn('Canvas not ready, retrying...');
      setTimeout(() => this.setupCanvasListeners(), 100);
      return;
    }

    console.log('✅ Properties panel connected to canvas');

    canvas.on('selection:created', (e: any) => {
      this.onObjectSelected(e.selected?.[0]);
    });

    canvas.on('selection:updated', (e: any) => {
      this.onObjectSelected(e.selected?.[0]);
    });

    canvas.on('selection:cleared', () => {
      this.onObjectDeselected();
    });

    canvas.on('object:modified', (e: any) => {
      if (e.target === this.selectedObject) {
        this.updateFormFromObject(e.target);
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private onObjectSelected(object: any) {
    if (!object || (object as any).isCanvasFrame || (object as any).isAlignmentGuide) {
      this.onObjectDeselected();
      return;
    }

    this.selectedObject = object;
    this.updateFormFromObject(object);
  }

  private onObjectDeselected() {
    this.selectedObject = null;
    
    // Instead of reset() which clears canvas dimensions, we just patch the current dimensions
    const dims = this.canvasService.getCanvasDimensions();
    this.propertiesForm.patchValue({
      canvasWidth: dims.width,
      canvasHeight: dims.height
    }, { emitEvent: false });
  }

  private updateFormFromObject(object: any) {
    // Get canvas offset to calculate relative position
    const offset = this.canvasService.getCanvasFrameOffset();

    const isText = object.type === 'i-text' || object.type === 'text' || object.type === 'switchboard-textbox';
    const isSwitchboardTextbox = object.type === 'switchboard-textbox';
    const isSwitchboardImage = object.type === 'switchboard-image';

    // Ensure color values are valid (never empty strings)
    const ensureValidColor = (color: any, fallback: string) => {
      return (color && typeof color === 'string' && color.trim() !== '') ? color : fallback;
    };

    this.propertiesForm.patchValue({
      name: (object as any).name || object.type,
      left: Math.round(object.left - offset.x),
      top: Math.round(object.top - offset.y),
      width: Math.round((isSwitchboardTextbox || isSwitchboardImage) ? object.width : (object.width * (object.scaleX || 1))),
      height: Math.round((isSwitchboardTextbox || isSwitchboardImage) ? object.height : (object.height * (object.scaleY || 1))),
      angle: Math.round(object.angle || 0),
      opacity: Math.round((object.opacity || 1) * 100),
      
      // Rectangle properties
      radius: Math.round(object.rx || 0),
      fill: ensureValidColor(object.fill, '#3B82F6'),
      stroke: ensureValidColor(object.stroke !== 'transparent' ? object.stroke : null, '#000000'),
      strokeWidth: object.strokeWidth ?? 0,
      
      // Text properties
      textContent: isText ? (object.text || '') : '',
      fontSize: isText ? Math.round(object.fontSize || 24) : 24,
      fontFamily: isText ? (object.fontFamily || 'Arial') : 'Arial',
      textColor: isText ? ensureValidColor(object.fill, '#000000') : '#000000',
      textAlign: isText ? (object.textAlign || 'center') : 'center',
      fontWeight: isText ? (object.fontWeight || 'normal') : 'normal',
      fontStyle: isText ? (object.fontStyle || 'normal') : 'normal',
      
      // Switchboard Textbox properties
      fillTextBox: isSwitchboardTextbox ? (object.fillTextBox || false) : false,
      maxFontSize: isSwitchboardTextbox ? (object.maxFontSize || 72) : 72,
      verticalAlign: isSwitchboardTextbox ? (object.verticalAlign || 'middle') : 'middle',
      letterSpacing: isSwitchboardTextbox ? (object.letterSpacing || 0) : 0,
      lineSpacing: isSwitchboardTextbox ? (object.lineSpacing || 1.16) : 1.16,
      textTransform: isSwitchboardTextbox ? (object.textTransform || 'none') : 'none',
      strokeColor: isSwitchboardTextbox ? (object.strokeColor || 'transparent') : 'transparent',
      strokeWidthValue: isSwitchboardTextbox ? (object.strokeWidthValue || 0) : 0,

      // Shadow properties (shared)
      shadowColor: object.shadow?.color || '#000000',
      shadowOffsetX: object.shadow?.offsetX ?? 0,
      shadowOffsetY: object.shadow?.offsetY ?? 0,
      shadowBlur: object.shadow?.blur ?? 0,

      // Switchboard Image properties
      horizontalAlign: isSwitchboardImage ? (object.horizontalAlign || 'center') : 'center',
      verticalAlignImage: isSwitchboardImage ? (object.verticalAlign || 'middle') : 'middle',
      contain: isSwitchboardImage ? (object.contain || false) : false,
      imageBackgroundColor: isSwitchboardImage ? (object.imageBackgroundColor || 'transparent') : 'transparent',
      imageBackgroundOpacity: isSwitchboardImage ? Math.round((object.imageBackgroundOpacity || 1) * 100) : 100,
    }, { emitEvent: false });
  }

  private updateObjectFromForm(values: any) {
    if (!this.selectedObject) return;

    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const offset = this.canvasService.getCanvasFrameOffset();
    const isText = this.selectedObject.type === 'i-text' || this.selectedObject.type === 'text' || this.selectedObject.type === 'switchboard-textbox';
    const isSwitchboardTextbox = this.selectedObject.type === 'switchboard-textbox';
    const isSwitchboardImage = this.selectedObject.type === 'switchboard-image';

    // Common properties
    this.selectedObject.set({
      left: values.left + offset.x,
      top: values.top + offset.y,
      angle: values.angle,
      opacity: values.opacity / 100,
    });

    // Shadow (shared across all object types)
    if (values.shadowBlur > 0 || values.shadowOffsetX !== 0 || values.shadowOffsetY !== 0) {
      this.selectedObject.set('shadow', new fabric.Shadow({
        color: values.shadowColor || 'rgba(0,0,0,0.5)',
        offsetX: values.shadowOffsetX || 0,
        offsetY: values.shadowOffsetY || 0,
        blur: values.shadowBlur || 0,
      }));
    } else {
      this.selectedObject.set('shadow', null);
    }

    // Rectangle-specific properties
    if (this.selectedObject.type === 'rect') {
      this.selectedObject.set({
        rx: values.radius,
        ry: values.radius,
        fill: values.fill,
        stroke: values.strokeWidth > 0 ? values.stroke : null,
        strokeWidth: values.strokeWidth,
      });
    }

    // Text-specific properties
    if (isText) {
      this.selectedObject.set({
        text: values.textContent,
        fontSize: values.fontSize,
        fontFamily: values.fontFamily,
        fill: values.textColor,
        textAlign: values.textAlign,
        fontWeight: values.fontWeight,
        fontStyle: values.fontStyle,
      });
    }

    // Switchboard Textbox-specific properties
    if (isSwitchboardTextbox) {
      // Update fixed dimensions
      this.selectedObject.fixedWidth = values.width;
      this.selectedObject.fixedHeight = values.height;
      this.selectedObject.width = values.width;
      this.selectedObject.height = values.height;
      
      // Update letter and line spacing
      if (this.selectedObject.setLetterSpacing) {
        this.selectedObject.setLetterSpacing(values.letterSpacing);
      }
      if (this.selectedObject.setLineSpacing) {
        this.selectedObject.setLineSpacing(values.lineSpacing);
      }
      
      // Update vertical alignment
      if (this.selectedObject.setVerticalAlign) {
        this.selectedObject.setVerticalAlign(values.verticalAlign);
      }
      
      // Update max font size
      if (this.selectedObject.setMaxFontSize) {
        this.selectedObject.setMaxFontSize(values.maxFontSize);
      }
      
      // Update fill text box mode
      if (this.selectedObject.setFillTextBox) {
        this.selectedObject.setFillTextBox(values.fillTextBox);
      }

      // Update text transform
      if (this.selectedObject.setTextTransform) {
        this.selectedObject.setTextTransform(values.textTransform);
      }

      // Update stroke
      if (this.selectedObject.setStrokeColor) {
        this.selectedObject.setStrokeColor(values.strokeColor);
      }
      if (this.selectedObject.setStrokeWidth) {
        this.selectedObject.setStrokeWidth(values.strokeWidthValue);
      }
      
      // Reset scale to 1
      this.selectedObject.scaleX = 1;
      this.selectedObject.scaleY = 1;
    } else if (isSwitchboardImage) {
      // Update dimensions
      this.selectedObject.set({
        width: values.width,
        height: values.height,
        horizontalAlign: values.horizontalAlign,
        verticalAlign: values.verticalAlignImage,
        contain: values.contain,
        imageBackgroundColor: values.imageBackgroundColor,
        imageBackgroundOpacity: values.imageBackgroundOpacity / 100,
        scaleX: 1,
        scaleY: 1
      });
    } else {
      // Handle size changes for non-Switchboard textboxes
      const currentWidth = this.selectedObject.width * (this.selectedObject.scaleX || 1);
      const currentHeight = this.selectedObject.height * (this.selectedObject.scaleY || 1);

      if (values.width !== currentWidth) {
        this.selectedObject.set({ scaleX: values.width / this.selectedObject.width });
      }
      if (values.height !== currentHeight) {
        this.selectedObject.set({ scaleY: values.height / this.selectedObject.height });
      }
    }

    // Store name
    (this.selectedObject as any).name = values.name;

    canvas.renderAll();
  }

  getObjectType(): string {
    if (!this.selectedObject) return '';
    return this.selectedObject.type || 'unknown';
  }

  // Text formatting helper methods
  setTextAlign(alignment: string) {
    this.propertiesForm.patchValue({ textAlign: alignment });
  }

  toggleFontWeight() {
    const currentWeight = this.propertiesForm.get('fontWeight')?.value;
    this.propertiesForm.patchValue({ 
      fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' 
    });
  }

  toggleFontStyle() {
    const currentStyle = this.propertiesForm.get('fontStyle')?.value;
    this.propertiesForm.patchValue({ 
      fontStyle: currentStyle === 'italic' ? 'normal' : 'italic' 
    });
  }

  setVerticalAlign(alignment: string) {
    if (this.isSwitchboardTextbox()) {
      this.propertiesForm.patchValue({ verticalAlign: alignment });
    } else if (this.isSwitchboardImage()) {
      this.propertiesForm.patchValue({ verticalAlignImage: alignment });
    }
  }

  setHorizontalAlign(alignment: string) {
    this.propertiesForm.patchValue({ horizontalAlign: alignment });
  }

  toggleFillTextBox() {
    const currentValue = this.propertiesForm.get('fillTextBox')?.value;
    this.propertiesForm.patchValue({ fillTextBox: !currentValue });
  }

  setTextTransform(value: string) {
    this.propertiesForm.patchValue({ textTransform: value });
  }

  isSwitchboardTextbox(): boolean {
    return this.selectedObject?.type === 'switchboard-textbox';
  }

  isSwitchboardImage(): boolean {
    return this.selectedObject?.type === 'switchboard-image';
  }

  isTextObject(): boolean {
    return this.selectedObject?.type === 'i-text' || 
           this.selectedObject?.type === 'text' || 
           this.selectedObject?.type === 'switchboard-textbox';
  }

  setPreset(width: number, height: number) {
    this.propertiesForm.patchValue({
      canvasWidth: width,
      canvasHeight: height
    });
  }
}
