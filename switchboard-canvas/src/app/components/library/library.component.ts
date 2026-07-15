import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService, ImageBlob, FontAsset } from '../../services/database.service';
import { FontService } from '../../services/font.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent implements OnInit {
  @Output() selectImage = new EventEmitter<string>();
  @Output() selectFont = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  activeTab: 'images' | 'fonts' = 'images';
  images: { id: string, url: string, fileName?: string }[] = [];
  fonts: FontAsset[] = [];
  loading = false;

  constructor(
    private db: DatabaseService,
    private fontService: FontService,
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadImages();
    this.loadFonts();
  }

  async loadImages() {
    const storedImages = await this.db.images.toArray();
    this.images = storedImages.map(img => ({
      id: img.id,
      url: this.db.getImageBlobUrl(img.blob),
      fileName: (img as any).fileName || 'Image'
    }));
  }

  async loadFonts() {
    this.fonts = await this.db.getAllFonts();
    for (const font of this.fonts) {
      await this.fontService.loadFont(font);
    }
  }

  async onImageUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.error('Image is too large. Maximum size is 5MB.');
      return;
    }

    this.loading = true;
    try {
      const imageId = uuidv4();
      const imageBlob: ImageBlob = {
        id: imageId,
        blob: file,
        mimeType: file.type,
        uploadedAt: new Date()
      };
      (imageBlob as any).fileName = file.name;

      await this.db.saveImage(imageBlob);
      await this.loadImages();
      this.notificationService.success('Image uploaded successfully');
    } catch (error) {
      this.notificationService.error('Failed to upload image');
    } finally {
      this.loading = false;
    }
  }

  async onFontUpload(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.loading = true;
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fontName = file.name.split('.').slice(0, -1).join('.') || file.name;

        const existingFonts = await this.db.getAllFonts();
        if (existingFonts.some(f => f.name.toLowerCase() === fontName.toLowerCase())) {
          this.notificationService.info(`Font "${fontName}" already exists`);
          continue;
        }

        await this.fontService.uploadFontToBackend(file, fontName);
        successCount++;
      }
      await this.loadFonts();
      if (successCount > 0) {
        this.notificationService.success(`${successCount} font(s) uploaded and saved to backend`);
      }
    } catch (error) {
      this.notificationService.error('Failed to upload fonts');
    } finally {
      this.loading = false;
    }
  }

  onSelectImage(img: any) {
    this.selectImage.emit(img.url);
    this.close.emit();
  }

  onSelectFont(font: FontAsset) {
    this.selectFont.emit(font.name);
    this.close.emit();
  }

  async deleteImage(event: Event, id: string) {
    event.stopPropagation();
    const img = this.images.find(i => i.id === id);
    if (img) this.db.revokeImageBlobUrl(img.url);
    await this.db.deleteImage(id);
    await this.loadImages();
  }

  async deleteFont(event: Event, id: string) {
    event.stopPropagation();
    if (confirm('Delete this font?')) {
      if (id.startsWith('backend-')) {
        const backendId = id.replace('backend-', '');
        try {
          await this.apiService.deleteFont(backendId);
        } catch (err) {
          console.error('Error deleting backend font:', err);
        }
      }
      await this.db.deleteFont(id);
      await this.loadFonts();
    }
  }
}
