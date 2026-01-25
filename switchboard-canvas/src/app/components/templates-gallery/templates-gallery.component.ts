import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DatabaseService, Template } from '../../services/database.service';
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
    private router: Router,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadTemplates();
  }

  async loadTemplates() {
    try {
      this.loading = true;
      this.templates = await this.db.getAllTemplates();
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      this.loading = false;
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
