import { Component, Input, Output, EventEmitter, ElementRef, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.css'
})
export class ColorPickerComponent implements AfterViewInit {
  @Input() color: string = '#000000';
  @Input() label: string = 'Color';
  @Output() colorChange = new EventEmitter<string>();

  showPicker = false;
  
  // Internal state for the picker
  hue: number = 0;
  saturation: number = 0;
  value: number = 0;
  
  hexValue: string = '';
  r: number = 0;
  g: number = 0;
  b: number = 0;

  @ViewChild('saturationCanvas') saturationCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hueCanvas') hueCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private elRef: ElementRef) {}

  ngOnChanges() {
    if (this.color && !this.showPicker) {
      this.hexValue = this.color;
      this.updateFromHex(this.color);
    }
  }

  ngAfterViewInit() {
    if (this.showPicker) {
      this.drawHueCanvas();
      this.drawSaturationCanvas();
    }
  }

  togglePicker() {
    this.showPicker = !this.showPicker;
    if (this.showPicker) {
      setTimeout(() => {
        this.drawHueCanvas();
        this.drawSaturationCanvas();
      }, 0);
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showPicker = false;
    }
  }

  drawHueCanvas() {
    if (!this.hueCanvas) return;
    const canvas = this.hueCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.17, '#ffff00');
    gradient.addColorStop(0.33, '#00ff00');
    gradient.addColorStop(0.5, '#00ffff');
    gradient.addColorStop(0.67, '#0000ff');
    gradient.addColorStop(0.83, '#ff00ff');
    gradient.addColorStop(1, '#ff0000');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  drawSaturationCanvas() {
    if (!this.saturationCanvas) return;
    const canvas = this.saturationCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, width, height);

    const whiteGradient = ctx.createLinearGradient(0, 0, width, 0);
    whiteGradient.addColorStop(0, '#fff');
    whiteGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = whiteGradient;
    ctx.fillRect(0, 0, width, height);

    const blackGradient = ctx.createLinearGradient(0, 0, 0, height);
    blackGradient.addColorStop(0, 'transparent');
    blackGradient.addColorStop(1, '#000');
    ctx.fillStyle = blackGradient;
    ctx.fillRect(0, 0, width, height);
  }

  onHueClick(event: MouseEvent) {
    this.updateHue(event);
  }

  onHueDrag(event: MouseEvent) {
    if (event.buttons === 1) {
      this.updateHue(event);
    }
  }

  updateHue(event: MouseEvent) {
    const canvas = this.hueCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    this.hue = (x / rect.width) * 360;
    this.drawSaturationCanvas();
    this.updateColor();
  }

  onSaturationClick(event: MouseEvent) {
    this.updateSaturation(event);
  }

  onSaturationDrag(event: MouseEvent) {
    if (event.buttons === 1) {
      this.updateSaturation(event);
    }
  }

  updateSaturation(event: MouseEvent) {
    const canvas = this.saturationCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    
    this.saturation = (x / rect.width) * 100;
    this.value = 100 - (y / rect.height) * 100;
    
    this.updateColor();
  }

  updateColor() {
    const { r, g, b } = this.hsvToRgb(this.hue, this.saturation, this.value);
    this.r = r;
    this.g = g;
    this.b = b;
    this.hexValue = this.rgbToHex(r, g, b);
    this.color = this.hexValue;
    this.colorChange.emit(this.color);
  }

  onHexInput() {
    if (/^#[0-9A-F]{6}$/i.test(this.hexValue)) {
      this.color = this.hexValue;
      this.updateFromHex(this.hexValue);
      this.colorChange.emit(this.color);
      if (this.showPicker) {
        this.drawSaturationCanvas();
      }
    }
  }

  onRgbInput() {
    this.r = Math.max(0, Math.min(255, this.r));
    this.g = Math.max(0, Math.min(255, this.g));
    this.b = Math.max(0, Math.min(255, this.b));
    this.hexValue = this.rgbToHex(this.r, this.g, this.b);
    this.color = this.hexValue;
    this.updateFromHex(this.hexValue);
    this.colorChange.emit(this.color);
    if (this.showPicker) {
      this.drawSaturationCanvas();
    }
  }

  updateFromHex(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this.r = r;
    this.g = g;
    this.b = b;
    const { h, s, v } = this.rgbToHsv(r, g, b);
    this.hue = h;
    this.saturation = s;
    this.value = v;
  }

  hsvToRgb(h: number, s: number, v: number) {
    s /= 100;
    v /= 100;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  rgbToHsv(r: number, g: number, b: number) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  rgbToHex(r: number, g: number, b: number) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  getSaturationHandleStyle() {
    return {
      left: `${this.saturation}%`,
      top: `${100 - this.value}%`,
      backgroundColor: this.hexValue
    };
  }

  getHueHandleStyle() {
    return {
      left: `${(this.hue / 360) * 100}%`
    };
  }
}
