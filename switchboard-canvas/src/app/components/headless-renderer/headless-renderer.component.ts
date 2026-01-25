import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as fabric from 'fabric';
import { CanvasService } from '../../services/canvas.service';
import { FontService } from '../../services/font.service';
import { SwitchboardImage } from '../../editor/fabric/switchboard-image';
import { SwitchboardTextbox } from '../../editor/fabric/switchboard-textbox';

@Component({
  selector: 'app-headless-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-white overflow-hidden" style="width: 100vw; height: 100vh;">
      <canvas id="headless-canvas" style="display: block;"></canvas>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class HeadlessRendererComponent implements OnInit, AfterViewInit {
  constructor(
    private canvasService: CanvasService,
    private fontService: FontService
  ) {}

  ngOnInit() {
    // Ensure we start fresh
    (window as any).renderComplete = false;

    // Expose the render function
    (window as any).renderDesign = async (config: any, overwrites: any, width: number, height: number) => {
      await this.performRender(config, overwrites, width, height);
    };
  }

  ngAfterViewInit() {
    // Initial canvas setup
    this.canvasService.initCanvas('headless-canvas');
  }

  async performRender(config: any, overwrites: any, width: number, height: number) {
    console.log('🏁 Starting performRender', { width, height });
    try {
      // 1. Setup Headless Mode
      console.log('📐 Configuring headless canvas...');
      this.canvasService.setupHeadless(width, height);
      this.canvasService.setClippingEnabled(false);

      // 2. Load Fonts (Both from DB and CSS)
      console.log('🔡 Loading fonts...');
      await this.fontService.loadAllFonts();
      // WAIT FOR CSS FONTS: Ensures @font-face fonts are ready
      await (document as any).fonts.ready;
      console.log('🔡 Fonts ready');

      // 3. Load Design Configuration
      console.log('📄 Loading JSON design...');
      await this.canvasService.loadFromJSON(config);

      // 4. Apply Overwrites
      console.log('📝 Applying API overwrites...');
      await this.canvasService.applyOverwrites(overwrites);

      // 5. Signal completion to Puppeteer via global variable
      const canvasElement = this.canvasService.getCanvas();
      if (canvasElement) {
        // IMPORTANT: Wait for images to be fully decoded/rendered
        const images = canvasElement.getObjects().filter(o => o.type === 'switchboard-image' || o.type === 'image');
        await Promise.all(images.map(img => {
          const element = (img as any).getElement?.();
          if (element && element.complete === false) {
            return new Promise(resolve => {
              element.onload = resolve;
              element.onerror = resolve;
            });
          }
          return Promise.resolve();
        }));

        // Final render after image sync
        canvasElement.renderAll();

        // DEBUG: Log all objects
        const objs = canvasElement.getObjects();
        console.log(`🔍 Final Export Check: ${objs.length} objects on canvas`);
        objs.forEach((o: any) => {
          console.log(`  - Element [${o.name || o.type}]: at (${Math.round(o.left)}, ${Math.round(o.top)}), size: ${Math.round(o.width)}x${Math.round(o.height)}, visible: ${o.visible}`);
        });

        // Use the same logic as your download button!
        // The viewport transform already handles scaling and positioning
        const dataUrl = canvasElement.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
          enableRetinaScaling: false
        });
        (window as any).renderedImage = dataUrl;
        console.log('🖼️ Image data generated (length: ' + dataUrl.length + ')');
      }

      console.log('✅ Rendering complete, signaling backend');
      (window as any).renderComplete = true;

    } catch (err: any) {
      console.error('❌ Headless Render Error Details:', err.message || err);
      // Still signal completion so Puppeteer doesn't hang
      (window as any).renderComplete = true;
    }
  }
}
