import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayersComponent } from '../layers/layers.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, LayersComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Output() openLibrary = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();

  activeTab: 'templates' | 'library' | 'layers' = 'templates';

  onLibraryClick() {
    this.openLibrary.emit();
  }

  onHomeClick() {
    this.goHome.emit();
  }
}
