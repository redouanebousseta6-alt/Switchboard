import { Routes } from '@angular/router';
import { TemplatesGalleryComponent } from './components/templates-gallery/templates-gallery.component';
import { EditorComponent } from './components/editor/editor.component';
import { HeadlessRendererComponent } from './components/headless-renderer/headless-renderer.component';

export const routes: Routes = [
  { path: '', component: TemplatesGalleryComponent },
  { path: 'editor/:id', component: EditorComponent },
  { path: 'render-headless', component: HeadlessRendererComponent },
  { path: '**', redirectTo: '' }
];
