import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService, FontAsset } from '../../services/database.service';
import { FontService } from '../../services/font.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-font-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './font-library.component.html',
  styleUrl: './font-library.component.css'
})
export class FontLibraryComponent implements OnInit {
  @Output() select = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  fonts: FontAsset[] = [];
  loading = false;

  constructor(
    private db: DatabaseService,
    private fontService: FontService
  ) {}

  ngOnInit() {
    this.syncAndLoad();
  }

  async syncAndLoad() {
    await this.fontService.syncPublicFonts();
    await this.loadFonts();
  }

  async loadFonts() {
    this.loading = true;
    try {
      this.fonts = await this.db.getAllFonts();
      // Ensure all fonts are loaded into the browser for previewing if needed
      for (const font of this.fonts) {
        await this.fontService.loadFont(font);
      }
    } finally {
      this.loading = false;
    }
  }

  async onFilesSelected(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.loading = true;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fontName = file.name.split('.')[0];
        
        // Generate preview
        const previewUrl = await this.fontService.generatePreview(fontName, file);

        const fontAsset: FontAsset = {
          id: uuidv4(),
          name: fontName,
          fileName: file.name,
          blob: file,
          mimeType: file.type || 'font/ttf',
          previewUrl: previewUrl,
          uploadedAt: new Date()
        };

        await this.db.saveFont(fontAsset);
        await this.fontService.loadFont(fontAsset);
      }
      await this.loadFonts();
    } catch (err) {
      console.error('Error uploading fonts:', err);
    } finally {
      this.loading = false;
    }
  }

  selectFont(font: FontAsset) {
    this.select.emit(font.name);
    this.close.emit();
  }

  async deleteFont(event: Event, id: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this font?')) {
      await this.db.deleteFont(id);
      await this.loadFonts();
    }
  }
}
