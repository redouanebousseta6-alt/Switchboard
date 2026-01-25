import { Injectable } from '@angular/core';
import { DatabaseService, FontAsset } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class FontService {
  private loadedFonts: Set<string> = new Set();

  constructor(private db: DatabaseService) {}

  /**
   * Sync fonts from the /public/fonts folder into the database
   * This makes them visible in the UI and available for rendering
   */
  async syncPublicFonts(): Promise<void> {
    const publicFonts = [
      { name: 'Alkia', path: 'alkia/Alkia.ttf' },
      { name: 'Anekina', path: 'anekina/Anekina.otf' },
      { name: 'Antagon', path: 'antagon/Antagon.otf' },
      { name: 'Batang Tebo', path: 'batang-tebo-2/Batang Tebo.otf' },
      { name: 'Belguri', path: 'belguri/Belguri.otf' },
      { name: 'Borsok', path: 'borsok/boorsok.otf' },
      { name: 'Broclen', path: 'broclen/BroclenRegular-JpR9M.ttf' },
      { name: 'Cream Cake Bold', path: 'cream_cake/Cream Cake Bold.otf' },
      { name: 'Cream Cake', path: 'cream_cake/Cream Cake.otf' },
      { name: 'Doughty Brush', path: 'doughty-brush/Doughtybrush-yYYaZ.ttf' },
      { name: 'Heavitas', path: 'heavitas/Heavitas.ttf' },
      { name: 'IntroRust', path: 'intro-rust/IntroRust.otf' },
      { name: 'IntroRustH2', path: 'intro-rust/IntroRustH2.otf' },
      { name: 'IntroRustL', path: 'intro-rust/IntroRustL.otf' },
      { name: 'Karina', path: 'karina_4/Karina.ttf' },
      { name: 'Montserrat', path: 'montserrat/Montserrat-Regular.ttf' },
      { name: 'Montserrat Bold', path: 'montserrat/Montserrat-Bold.ttf' },
      { name: 'OVSoge', path: 'ov-soge/OVSoge-Regular.otf' },
      { name: 'Ralgine', path: 'ralgine/Ralgine-9MMJ2.otf' },
      { name: 'Remember Summerday', path: 'remember-summerday/RememberSummerday-XGG9K.ttf' },
      { name: 'Requiner', path: 'requiner/Requiner-6RRLM.otf' },
      { name: 'Rosemith', path: 'rosemith/Rosemith-8OOBg.otf' },
      { name: 'Slogest', path: 'slogest/Slogest.otf' },
      { name: 'Soul Daisy', path: 'soul-daisy/SoulDaisy.otf' },
      { name: 'Violleva', path: 'violleva/Violleva.ttf' },
      { name: 'Waterlily', path: 'waterlily/Waterlily Script.ttf' },
      { name: 'White Colors', path: 'white-colors/WhiteColors-xRRgR.ttf' }
    ];

    console.log('🔄 Syncing public fonts...');
    const existingFonts = await this.db.getAllFonts();
    const existingNames = new Set(existingFonts.map(f => f.name));

    for (const fontInfo of publicFonts) {
      if (existingNames.has(fontInfo.name)) continue;

      try {
        const fullUrl = `/fonts/${fontInfo.path}`;
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const blob = await response.blob();
        const fontName = fontInfo.name;
        
        // Generate preview
        const previewUrl = await this.generatePreview(fontName, blob);

        const fontAsset: FontAsset = {
          id: `system-${fontName.toLowerCase().replace(/\s+/g, '-')}`,
          name: fontName,
          fileName: fontInfo.path.split('/').pop() || fontName,
          blob: blob,
          mimeType: blob.type || 'font/ttf',
          previewUrl: previewUrl,
          uploadedAt: new Date()
        };

        await this.db.saveFont(fontAsset);
        console.log(`✅ Synced system font: ${fontName}`);
      } catch (err) {
        console.error(`❌ Failed to sync font ${fontInfo.name}:`, err);
      }
    }
    console.log('✅ Font sync complete');
  }

  /**
   * Load all fonts from database into the browser
   */
  async loadAllFonts(): Promise<void> {
    const fonts = await this.db.getAllFonts();
    for (const font of fonts) {
      await this.loadFont(font);
    }
  }

  /**
   * Load a single font into the browser's FontFace set
   */
  async loadFont(font: FontAsset): Promise<void> {
    if (this.loadedFonts.has(font.name)) return;

    try {
      const arrayBuffer = await font.blob.arrayBuffer();
      const fontFace = new FontFace(font.name, arrayBuffer);
      const loadedFace = await fontFace.load();
      (document as any).fonts.add(loadedFace);
      this.loadedFonts.add(font.name);
      console.log(`✅ Font loaded: ${font.name}`);
    } catch (err) {
      console.error(`❌ Failed to load font ${font.name}:`, err);
    }
  }

  /**
   * Generate an "Aa" preview image for a font
   */
  async generatePreview(fontName: string, blob: Blob): Promise<string> {
    // We need to ensure the font is loaded before drawing to canvas
    // For newly uploaded fonts, we load them first
    const arrayBuffer = await blob.arrayBuffer();
    const fontFace = new FontFace(`preview-${fontName}`, arrayBuffer);
    const loadedFace = await fontFace.load();
    (document as any).fonts.add(loadedFace);

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw "Aa" text
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `80px "preview-${fontName}"`;
    ctx.fillText('Aa', canvas.width / 2, canvas.height / 2 - 10);

    // Draw font name at bottom
    ctx.font = '12px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(fontName, canvas.width / 2, canvas.height - 25);

    const dataUrl = canvas.toDataURL('image/png');
    
    // Cleanup preview font
    (document as any).fonts.delete(loadedFace);
    
    return dataUrl;
  }

  /**
   * Get available font names
   */
  getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts);
  }
}
