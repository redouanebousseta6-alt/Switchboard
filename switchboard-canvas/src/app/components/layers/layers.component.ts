import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../services/canvas.service';

interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  object: any;
}

@Component({
  selector: 'app-layers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './layers.component.html',
  styleUrl: './layers.component.css'
})
export class LayersComponent implements OnInit, OnDestroy {
  layers: LayerItem[] = [];
  selectedLayerId: string | null = null;
  draggedLayerIndex: number | null = null;
  dragOverLayerIndex: number | null = null;

  constructor(private canvasService: CanvasService) {}

  ngOnInit() {
    setTimeout(() => {
      this.setupCanvasListeners();
      this.refreshLayers();
    }, 150);
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private setupCanvasListeners() {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) {
      setTimeout(() => this.setupCanvasListeners(), 100);
      return;
    }

    console.log('✅ Layers panel connected to canvas');

    // Refresh layers when objects are added/removed/modified
    canvas.on('object:added', () => this.refreshLayers());
    canvas.on('object:removed', () => this.refreshLayers());
    canvas.on('object:modified', () => this.refreshLayers());

    // Update selection state
    canvas.on('selection:created', (e: any) => {
      const selected = e.selected?.[0];
      if (selected && !(selected as any).isCanvasFrame && !(selected as any).isAlignmentGuide) {
        this.selectedLayerId = this.getObjectId(selected);
      }
    });

    canvas.on('selection:updated', (e: any) => {
      const selected = e.selected?.[0];
      if (selected && !(selected as any).isCanvasFrame && !(selected as any).isAlignmentGuide) {
        this.selectedLayerId = this.getObjectId(selected);
      }
    });

    canvas.on('selection:cleared', () => {
      this.selectedLayerId = null;
    });
  }

  private refreshLayers() {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const objects = canvas.getObjects();
    
    // Filter out canvas frame and alignment guides
    const validObjects = objects.filter((obj: any) => 
      !obj.isCanvasFrame && !obj.isAlignmentGuide
    );

    // Reverse order so top element appears first in list
    this.layers = validObjects.reverse().map((obj: any, index) => ({
      id: this.getObjectId(obj),
      name: obj.name || `${this.getTypeName(obj.type)}-${index + 1}`,
      type: obj.type,
      visible: obj.visible !== false,
      locked: obj.selectable === false,
      object: obj
    }));
  }

  private getObjectId(obj: any): string {
    // Use a unique identifier or create one
    if (!obj._layerId) {
      obj._layerId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return obj._layerId;
  }

  private getTypeName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'rect': 'Rectangle',
      'i-text': 'Text',
      'text': 'Text',
      'switchboard-textbox': 'Switchboard Text',
      'image': 'Image',
      'switchboard-image': 'Switchboard Image'
    };
    return typeMap[type] || type;
  }

  selectLayer(layer: LayerItem) {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.setActiveObject(layer.object);
    canvas.renderAll();
    this.selectedLayerId = layer.id;
  }

  toggleVisibility(layer: LayerItem, event: Event) {
    event.stopPropagation();
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    layer.object.visible = !layer.object.visible;
    layer.visible = layer.object.visible;
    
    // If hiding, deselect it
    if (!layer.visible && canvas.getActiveObject() === layer.object) {
      canvas.discardActiveObject();
    }
    
    canvas.renderAll();
  }

  toggleLock(layer: LayerItem, event: Event) {
    event.stopPropagation();
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    // In Fabric, locked means not selectable and not evented (usually)
    const isLocked = !layer.locked;
    layer.object.set({
      selectable: !isLocked,
      evented: !isLocked,
      hasControls: !isLocked
    });
    
    layer.locked = isLocked;
    
    // If locking, deselect it
    if (isLocked && canvas.getActiveObject() === layer.object) {
      canvas.discardActiveObject();
    }
    
    canvas.renderAll();
  }

  deleteLayer(layer: LayerItem, event: Event) {
    event.stopPropagation();
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.remove(layer.object);
    canvas.renderAll();
    this.refreshLayers();
  }

  getTypeIcon(type: string): string {
    // Return SVG path for different element types
    const icons: { [key: string]: string } = {
      'rect': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
      'i-text': 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7',
      'text': 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7',
      'switchboard-textbox': 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7',
      'image': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01',
      'switchboard-image': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01'
    };
    return icons[type] || 'M4 6h16M4 12h16M4 18h16';
  }

  // Drag-and-drop methods for reordering
  onDragStart(event: DragEvent, index: number) {
    this.draggedLayerIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', ''); // Required for Firefox
    }
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverLayerIndex = index;
  }

  onDragLeave(event: DragEvent) {
    this.dragOverLayerIndex = null;
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    event.stopPropagation();

    if (this.draggedLayerIndex === null || this.draggedLayerIndex === dropIndex) {
      this.draggedLayerIndex = null;
      this.dragOverLayerIndex = null;
      return;
    }

    // Reorder layers array
    const draggedLayer = this.layers[this.draggedLayerIndex];
    this.layers.splice(this.draggedLayerIndex, 1);
    this.layers.splice(dropIndex, 0, draggedLayer);

    // Update canvas z-index (remember: layers array is reversed from canvas order)
    this.updateCanvasOrder();

    this.draggedLayerIndex = null;
    this.dragOverLayerIndex = null;
  }

  onDragEnd(event: DragEvent) {
    this.draggedLayerIndex = null;
    this.dragOverLayerIndex = null;
  }

  private updateCanvasOrder() {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    // Get all objects and find the canvas frame
    const allObjects = canvas.getObjects();
    const canvasFrame = allObjects.find((obj: any) => obj.isCanvasFrame);
    
    // Layers array is in reverse order (top first in list = last in canvas)
    // We need to reverse it back to get the correct canvas order (bottom to top)
    const reversedLayers = [...this.layers].reverse();
    
    // Fabric.js v6 doesn't have moveTo(), so we manipulate the _objects array directly
    const canvasAny = canvas as any;
    
    // Build new objects array in correct order
    const newObjectsOrder: any[] = [];
    
    // Add canvas frame first if it exists
    if (canvasFrame) {
      newObjectsOrder.push(canvasFrame);
    }
    
    // Add user objects in the new order
    reversedLayers.forEach(layer => {
      newObjectsOrder.push(layer.object);
    });
    
    // Add any alignment guides or other special objects
    allObjects.forEach((obj: any) => {
      if (!obj.isCanvasFrame && !reversedLayers.find(l => l.object === obj)) {
        newObjectsOrder.push(obj);
      }
    });
    
    // Replace the _objects array
    canvasAny._objects = newObjectsOrder;
    
    canvas.renderAll();
    console.log('🔄 Layer order updated');
  }
}
