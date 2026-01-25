import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// Template interface matching Switchboard structure
export interface Template {
  id: string;
  displayName: string;
  apiName: string;
  configuration: any; // JSON object with template config
  thumbnailUrl?: string;
  createdDate: Date;
  updatedAt?: Date;
  createdBy?: string;
}

// Image blob storage
export interface ImageBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  uploadedAt: Date;
}

// Font asset storage
export interface FontAsset {
  id: string; // filename or unique ID
  name: string; // font family name
  fileName: string;
  blob: Blob;
  mimeType: string;
  previewUrl?: string; // Data URL for the "Aa" thumbnail
  uploadedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  // Declare tables
  templates!: Table<Template, string>;
  images!: Table<ImageBlob, string>;
  fonts!: Table<FontAsset, string>;

  constructor() {
    super('SwitchboardCanvasDB');
    
    // Define database schema
    this.version(2).stores({
      templates: 'id, displayName, apiName, createdDate',
      images: 'id, uploadedAt',
      fonts: 'id, name, uploadedAt'
    });
  }

  // Helper methods for templates
  // ... existing methods ...
  async getAllTemplates(): Promise<Template[]> {
    return await this.templates.orderBy('createdDate').reverse().toArray();
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return await this.templates.get(id);
  }

  async saveTemplate(template: Template): Promise<string> {
    return await this.templates.put(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.templates.delete(id);
  }

  // Helper methods for images
  async saveImage(image: ImageBlob): Promise<string> {
    return await this.images.put(image);
  }

  async getImage(id: string): Promise<ImageBlob | undefined> {
    return await this.images.get(id);
  }

  async deleteImage(id: string): Promise<void> {
    await this.images.delete(id);
  }

  // Helper methods for fonts
  async saveFont(font: FontAsset): Promise<string> {
    return await this.fonts.put(font);
  }

  async getFont(id: string): Promise<FontAsset | undefined> {
    return await this.fonts.get(id);
  }

  async getAllFonts(): Promise<FontAsset[]> {
    return await this.fonts.toArray();
  }

  async deleteFont(id: string): Promise<void> {
    await this.fonts.delete(id);
  }

  // Get blob URL for display
  getImageBlobUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  // Cleanup blob URL when done
  revokeImageBlobUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}
