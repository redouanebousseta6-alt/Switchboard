import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularSplitModule } from 'angular-split';
import * as fabric from 'fabric';
import { DatabaseService } from '../../services/database.service';
import { CanvasService } from '../../services/canvas.service';
import { PropertiesComponent } from '../properties/properties.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ImageLibraryComponent } from '../image-library/image-library.component';
import { FontLibraryComponent } from '../font-library/font-library.component';
import { LibraryComponent } from '../library/library.component';
import { ApiRunnerComponent } from '../api-runner/api-runner.component';
import { SwitchboardTextbox } from '../../editor/fabric/switchboard-textbox';
import { FontService } from '../../services/font.service';
import { NotificationService } from '../../services/notification.service';
import { HistoryService } from '../../services/history/history.service';
import { ApiService } from '../../services/api.service';
import { ApiSnippetComponent } from '../api-snippet/api-snippet.component';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    AngularSplitModule, 
    PropertiesComponent, 
    SidebarComponent,
    ImageLibraryComponent,
    FontLibraryComponent,
    LibraryComponent,
    ApiRunnerComponent,
    ApiSnippetComponent
  ],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css'
})
export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  templateId: string | null = null;
  templateName = 'Untitled Template';
  isNewTemplate = false;
  canvasDimensions = { width: 600, height: 1200 };
  clippingEnabled = true;
  zoomLevel = 100;
  showImageLibrary = false;
  showFontLibrary = false;
  showLibrary = false;
  showApiRunner = false;
  showApiSnippet = false;
  isSaving = false;
  apiElements: any = {};
  apiTemplateId: string = '';
  canUndo = false;
  canRedo = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: DatabaseService,
    private canvasService: CanvasService,
    private fontService: FontService,
    private notificationService: NotificationService,
    private historyService: HistoryService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.fontService.loadAllFonts(); // Load custom fonts on startup

    // Subscribe to history changes
    this.historyService.historyChanged$.subscribe(state => {
      this.canUndo = state.canUndo;
      this.canRedo = state.canRedo;
    });

    this.route.params.subscribe(params => {
      this.templateId = params['id'];
      this.isNewTemplate = this.templateId === 'new';
      
      if (this.isNewTemplate) {
        console.log('Creating new template');
      } else if (this.templateId) {
        this.loadTemplate(this.templateId);
      }
    });
  }

  async syncToApi() {
    if (this.isSaving) return;
    
    try {
      this.isSaving = true;
      const canvasData = await this.canvasService.serialize();
      const templateData = {
        id: this.templateId || `tpl-${Date.now()}`,
        displayName: this.templateName,
        apiName: this.templateName.toLowerCase().replace(/\s+/g, '_'),
        configuration: canvasData
      };

      await this.apiService.syncTemplate(templateData);
      this.notificationService.success('Template synced to API successfully');
    } catch (error) {
      console.error('Sync error:', error);
      this.notificationService.error('Failed to sync to API. Make sure the backend server is running.');
    } finally {
      this.isSaving = false;
    }
  }

  ngAfterViewInit() {
    // Initialize Fabric.js canvas after view is ready
    setTimeout(() => {
      this.canvasService.initCanvas('fabric-canvas');
      this.canvasDimensions = this.canvasService.getCanvasDimensions();
      
      // Update zoom level display periodically (for Ctrl+Scroll)
      setInterval(() => {
        const currentZoom = this.canvasService.getZoom();
        this.zoomLevel = Math.round(currentZoom * 100);
      }, 100);
    }, 100);
  }

  ngOnDestroy() {
    // Clean up canvas when component is destroyed
    this.canvasService.disposeCanvas();
  }

  async loadTemplate(id: string) {
    try {
      const template = await this.db.getTemplate(id);
      if (template) {
        console.log('Loaded template:', template);
        this.templateName = template.displayName;
        // The canvas initialization happens in ngAfterViewInit, so we wait a bit
        setTimeout(async () => {
          await this.canvasService.loadFromJSON(template.configuration);
        }, 200);
      } else {
        this.notificationService.error('Template not found');
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      this.notificationService.error('Failed to load template');
    }
  }

  async saveTemplate() {
    if (!this.templateName || this.templateName.trim() === '') {
      this.notificationService.error('Please enter a template name');
      return;
    }

    this.isSaving = true;
    try {
      const allTemplates = await this.db.getAllTemplates();
      const duplicate = allTemplates.find(t => 
        t.displayName.toLowerCase() === this.templateName.toLowerCase() && 
        t.id !== this.templateId
      );

      if (duplicate) {
        this.notificationService.error('A template with this name already exists');
        this.isSaving = false;
        return;
      }

      const canvasData = await this.canvasService.serialize();
      let thumbnail = '';
      try {
        thumbnail = await this.canvasService.generateThumbnail(300, 200);
      } catch (thumbError) {
        console.warn('⚠️ Could not generate thumbnail (likely CORS/Tainted Canvas):', thumbError);
        // Fallback to empty thumbnail or a placeholder if generation fails
      }
      
      const templateId = this.isNewTemplate ? `tpl-${Date.now()}` : this.templateId!;
      
      const template = {
        id: templateId,
        displayName: this.templateName,
        apiName: this.templateName.toLowerCase().replace(/\s+/g, '_'),
        configuration: canvasData,
        thumbnailUrl: thumbnail,
        createdDate: this.isNewTemplate ? new Date() : (await this.db.getTemplate(templateId))?.createdDate || new Date(),
        updatedAt: new Date()
      };

      await this.db.saveTemplate(template as any);
      
      if (this.isNewTemplate) {
        this.isNewTemplate = false;
        this.templateId = templateId;
        this.router.navigate(['/editor', templateId]);
      }
      
      this.notificationService.success('Template saved successfully');
    } catch (error) {
      console.error('❌ Error saving template:', error);
      this.notificationService.error('Failed to save template. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  async exportPNG() {
    try {
      // Get current dimensions directly from the service to ensure they are up to date
      const dims = this.canvasService.getCanvasDimensions();
      const dataUrl = await this.canvasService.generateThumbnail(dims.width, dims.height);
      const link = document.createElement('a');
      link.download = `${this.templateName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Error exporting PNG');
    }
  }

  toggleApiRunner() {
    this.showApiRunner = !this.showApiRunner;
  }

  async openApiSnippet() {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const objects = this.canvasService.getObjects();
    const elements: any = {};

    objects.forEach((obj: any) => {
      if (obj.isCanvasFrame || obj.isAlignmentGuide) return;

      const apiName = obj.name || obj.type;
      const elementProps: any = {};

      if (obj.type === 'switchboard-textbox' || obj.type === 'i-text' || obj.type === 'text') {
        elementProps.text = obj.text || '';
        elementProps.textColor = obj.fill || '#000000';
        if (obj.type === 'switchboard-textbox') {
          elementProps.fillTextBox = !!obj.fillTextBox;
          elementProps.verticalAlignment = obj.verticalAlign || 'middle';
          elementProps.horizontalAlignment = obj.textAlign || 'left';
        }
      } else if (obj.type === 'switchboard-image') {
        let imageUrl = obj.src || '';
        // AUTO-CLEAN BLOB URLs for testing
        if (imageUrl.startsWith('blob:')) {
          imageUrl = imageUrl.replace('blob:', '');
        }
        elementProps.url = imageUrl;
        elementProps.backgroundColor = obj.imageBackgroundColor || 'transparent';
        elementProps.backgroundOpacity = obj.imageBackgroundOpacity || 1;
        elementProps.contain = !!obj.contain;
        elementProps.horizontalAlignment = obj.horizontalAlign || 'center';
        elementProps.verticalAlignment = obj.verticalAlign || 'middle';
      } else if (obj.type === 'rect') {
        elementProps.fillColor = obj.fill || '#cccccc';
      }

      // Common properties
      elementProps.opacity = obj.opacity || 1;
      elementProps.angle = obj.angle || 0;

      elements[apiName] = elementProps;
    });

    this.apiElements = elements;
    this.apiTemplateId = this.templateName.toLowerCase().replace(/\s+/g, '_');
    this.canvasDimensions = this.canvasService.getCanvasDimensions();
    this.showApiSnippet = true;
  }

  async onApplyOverwrites(overwrites: any) {
    try {
      await this.canvasService.applyOverwrites(overwrites);
    } catch (error) {
      console.error('Error applying overwrites:', error);
      alert('Error applying overwrites');
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  // Test methods to add elements
  addTestRectangle() {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: '#cccccc',
      strokeWidth: 0,
      rx: 0,
      ry: 0,
    });

    this.canvasService.addObject(rect);
  }

  addTestText() {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    // Get the frame/design area dimensions
    const dims = this.canvasService.getCanvasDimensions();
    const fixedWidth = 300;
    const fixedHeight = 150;

    // Center the text box relative to the design area (frame)
    // We pass relative coordinates (0 to 600) andaddObject handles the offset
    const left = (dims.width / 2) - (fixedWidth / 2);
    const top = (dims.height / 2) - (fixedHeight / 2);

    // Create Switchboard-style text box with fixed container dimensions
    const text = new SwitchboardTextbox('Click to Edit', {
      left: left,
      top: top,
      fixedWidth: fixedWidth,
      fixedHeight: fixedHeight,
      fontSize: 24,
      fill: '#000000',
      fontFamily: 'Arial',
      textAlign: 'center',
      fillTextBox: true,    // Enable auto font sizing
      maxFontSize: 72,       // Maximum font size for auto-fit
      verticalAlign: 'middle', // Center vertically
      letterSpacing: 0,
      lineSpacing: 1.16,
    });

    this.canvasService.addObject(text);
  }

  addTestImage() {
    this.showImageLibrary = true;
  }

  onImageSelected(url: string) {
    this.canvasService.addImage(url, {
      left: 150,
      top: 150,
      width: 400,
      height: 300,
      horizontalAlign: 'center',
      verticalAlign: 'middle',
      contain: false,
    });
    this.showImageLibrary = false;
  }

  // Font Library Handlers
  openFontLibrary() {
    this.showLibrary = true;
  }

  onFontSelected(fontName: string) {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === 'switchboard-textbox' || activeObject.type === 'i-text')) {
      activeObject.set('fontFamily', fontName);
      
      // Explicitly trigger the modified event so the Properties panel updates its form
      activeObject.fire('modified');
      canvas.fire('object:modified', { target: activeObject });

      if ((activeObject as any).fitTextToBox) {
        (activeObject as any).fitTextToBox();
      }
      canvas.requestRenderAll();
    }
    this.showFontLibrary = false;
  }

  // Task 3.3: Clipping Toggle
  toggleClipping() {
    this.clippingEnabled = !this.clippingEnabled;
    this.canvasService.setClippingEnabled(this.clippingEnabled);
  }

  // Task 3.4: Zoom Controls
  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel + 10, 200);
    this.canvasService.setZoom(this.zoomLevel / 100);
  }

  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel - 10, 10);
    this.canvasService.setZoom(this.zoomLevel / 100);
  }

  resetZoom() {
    this.zoomLevel = 100;
    this.canvasService.setZoom(1);
  }

  undo() {
    this.canvasService.undo();
  }

  redo() {
    this.canvasService.redo();
  }
}
