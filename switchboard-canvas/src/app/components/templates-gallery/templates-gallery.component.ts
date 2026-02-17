import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as fabric from 'fabric';
import { DatabaseService, Template } from '../../services/database.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

// Import custom Fabric classes so they register with classRegistry before loadFromJSON
import '../../editor/fabric/switchboard-image';
import '../../editor/fabric/switchboard-textbox';

@Component({
  selector: 'app-templates-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-gallery.component.html',
  styleUrl: './templates-gallery.component.css'
})
export class TemplatesGalleryComponent implements OnInit {
  templates: Template[] = [];
  loading = true;

  constructor(
    private db: DatabaseService,
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadTemplates();
  }

  async loadTemplates() {
    try {
      this.loading = true;

      // Fetch templates from backend and sync to local IndexedDB
      await this.syncFromBackend();

      // Load all templates from local DB (now includes synced backend templates)
      this.templates = await this.db.getAllTemplates();

      // Generate thumbnails in the background for templates missing them
      this.generateMissingThumbnails();
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Fetch all templates from the backend API and save any missing ones to local IndexedDB.
   * Local templates take precedence (they may have unsaved edits or thumbnails).
   */
  private async syncFromBackend(): Promise<void> {
    try {
      const response = await this.apiService.getAllTemplates();
      if (!response?.success || !response?.templates) return;

      const backendTemplates: any[] = response.templates;
      const localTemplates = await this.db.getAllTemplates();
      const localIds = new Set(localTemplates.map((t: Template) => t.id));

      for (const bt of backendTemplates) {
        if (!localIds.has(bt.id)) {
          // Backend template not in local DB -- save it locally
          const template: Template = {
            id: bt.id,
            displayName: bt.display_name,
            apiName: bt.api_name,
            configuration: bt.configuration,
            createdDate: new Date(bt.created_at),
            updatedAt: bt.updated_at ? new Date(bt.updated_at) : undefined,
          };
          await this.db.saveTemplate(template);
        }
      }
    } catch (error) {
      // Backend may be unreachable; continue with local templates only
      console.warn('Could not sync templates from backend:', error);
    }
  }

  /**
   * Generate thumbnails for templates that don't have one.
   * Uses an off-screen Fabric.js StaticCanvas to render the template config,
   * finds the Canvas Frame, and exports a cropped image.
   */
  private async generateMissingThumbnails(): Promise<void> {
    const templatesNeedingThumbnails = this.templates.filter(t => !t.thumbnailUrl && t.configuration);
    if (templatesNeedingThumbnails.length === 0) return;

    for (const template of templatesNeedingThumbnails) {
      try {
        const thumbnail = await this.renderThumbnail(template.configuration);
        if (thumbnail) {
          template.thumbnailUrl = thumbnail;
          await this.db.saveTemplate(template);
        }
      } catch (err) {
        console.warn(`Could not generate thumbnail for "${template.displayName}":`, err);
      }
    }
  }

  /**
   * Render a template configuration into a thumbnail data URL using an off-screen canvas.
   * Finds the Canvas Frame rect and crops the export to it.
   */
  private async renderThumbnail(configuration: any): Promise<string | null> {
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 2000;
    canvasEl.height = 3000;
    const tempCanvas = new fabric.StaticCanvas(canvasEl);

    try {
      await tempCanvas.loadFromJSON(configuration);
      tempCanvas.renderAll();

      // Find the Canvas Frame -- the white design area rect
      const frame = tempCanvas.getObjects().find((obj: any) =>
        (obj as any).isCanvasFrame ||
        (obj as any).name === 'Canvas Frame' ||
        (obj.type === 'Rect' && obj.fill === '#FFFFFF' && obj.selectable === false)
      );

      if (!frame) return null;

      const thumbWidth = 300;
      const multiplier = thumbWidth / (frame.width || 800);

      return tempCanvas.toDataURL({
        format: 'png',
        quality: 0.8,
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        multiplier,
        enableRetinaScaling: false,
      } as any);
    } finally {
      tempCanvas.dispose();
    }
  }

  createNewTemplate() {
    this.router.navigate(['/editor', 'new']);
  }

  openTemplate(template: Template) {
    this.router.navigate(['/editor', template.id]);
  }

  async duplicateTemplate(template: Template, event: Event) {
    event.stopPropagation();

    try {
      // Generate a unique display name (e.g., "Template-1 (Copy)", "Template-1 (Copy 2)")
      const allTemplates = await this.db.getAllTemplates();
      const baseName = template.displayName.replace(/\s*\(Copy(?:\s\d+)?\)$/, '');
      let copyNumber = 1;
      let newName = `${baseName} (Copy)`;

      const existingNames = new Set(allTemplates.map(t => t.displayName.toLowerCase()));
      while (existingNames.has(newName.toLowerCase())) {
        copyNumber++;
        newName = `${baseName} (Copy ${copyNumber})`;
      }

      const newId = `tpl-${Date.now()}`;
      const duplicate: Template = {
        id: newId,
        displayName: newName,
        apiName: newName.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, ''),
        configuration: JSON.parse(JSON.stringify(template.configuration)),
        thumbnailUrl: template.thumbnailUrl,
        createdDate: new Date(),
        updatedAt: new Date(),
      };

      // Save only to local IndexedDB -- NOT synced to backend until user hits Save in editor
      await this.db.saveTemplate(duplicate);
      await this.loadTemplates();
      this.notificationService.success(`Duplicated as "${newName}". Open it and hit Save to publish.`);
    } catch (error) {
      console.error('Error duplicating template:', error);
      this.notificationService.error('Failed to duplicate template');
    }
  }

  async deleteTemplate(template: Template, event: Event) {
    event.stopPropagation();
    
    if (confirm(`Delete template "${template.displayName}"?`)) {
      try {
        await this.db.deleteTemplate(template.id);
        await this.loadTemplates();
        this.notificationService.success(`Template "${template.displayName}" deleted`);
      } catch (error) {
        console.error('Error deleting template:', error);
        this.notificationService.error('Failed to delete template');
      }
    }
  }
}
