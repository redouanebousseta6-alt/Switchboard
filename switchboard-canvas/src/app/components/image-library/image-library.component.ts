import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService, ImageBlob } from '../../services/database.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-image-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-library.component.html',
  styleUrl: './image-library.component.css'
})
export class ImageLibraryComponent implements OnInit {
  @Output() select = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  images: { id: string, url: string }[] = [];

  constructor(private db: DatabaseService) {}

  ngOnInit() {
    this.loadImages();
  }

  async loadImages() {
    const storedImages = await this.db.images.toArray();
    this.images = storedImages.map(img => ({
      id: img.id,
      url: this.db.getImageBlobUrl(img.blob)
    }));
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const imageId = uuidv4();
    const imageBlob: ImageBlob = {
      id: imageId,
      blob: file,
      mimeType: file.type,
      uploadedAt: new Date()
    };

    await this.db.saveImage(imageBlob);
    await this.loadImages();
  }

  selectImage(img: { id: string, url: string }) {
    this.select.emit(img.url);
    this.close.emit();
  }

  async deleteImage(event: Event, id: string) {
    event.stopPropagation();
    
    // Find the image to revoke its URL to prevent memory leaks
    const imgToDelete = this.images.find(i => i.id === id);
    if (imgToDelete) {
      this.db.revokeImageBlobUrl(imgToDelete.url);
    }

    await this.db.deleteImage(id);
    await this.loadImages();
  }

  triggerUnsplash() {
    alert('Unsplash integration coming in Phase 7! For now, please use the Upload button.');
  }
}
