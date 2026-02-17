import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DatabaseService, Template } from '../../services/database.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

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

  createNewTemplate() {
    this.router.navigate(['/editor', 'new']);
  }

  openTemplate(template: Template) {
    this.router.navigate(['/editor', template.id]);
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
