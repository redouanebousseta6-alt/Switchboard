import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-api-runner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div class="flex items-center space-x-2">
            <div class="bg-primary-600 p-1.5 rounded-lg shadow-sm">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold text-gray-800">API Runner</h2>
              <p class="text-xs text-gray-500 font-medium">Test Switchboard JSON Overwrites</p>
            </div>
          </div>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 flex-1 overflow-y-auto space-y-4">
          <div class="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start space-x-3">
            <svg class="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-blue-800 leading-relaxed">
              Paste a Switchboard-compatible <code>elements</code> JSON object below. 
              The runner will find elements by their <strong>API Name</strong> and apply the overwrites.
            </p>
          </div>

          <div class="relative group">
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">JSON Payload (elements)</label>
            <textarea 
              [(ngModel)]="jsonPayload" 
              rows="12"
              class="w-full px-4 py-3 bg-gray-900 text-gray-100 font-mono text-sm rounded-lg border-2 border-transparent focus:border-primary-500 focus:ring-0 transition-all outline-none shadow-inner resize-none"
              placeholder='{
  "text-element": {
    "text": "Hello World",
    "fillColor": "#FF0000"
  },
  "image-element": {
    "url": "https://example.com/photo.jpg"
  }
}'></textarea>
            <div class="absolute top-8 right-3 text-[10px] font-bold text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              JSON
            </div>
          </div>

          <div *ngIf="error" class="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center space-x-2 text-red-600 animate-pulse">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-xs font-semibold">{{ error }}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
          <button 
            (click)="close.emit()" 
            class="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-all active:scale-95">
            Cancel
          </button>
          <button 
            (click)="run()" 
            class="px-8 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-lg shadow-primary-200 transition-all active:scale-95 flex items-center space-x-2">
            <span>Run Overwrites</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    textarea::-webkit-scrollbar {
      width: 8px;
    }
    textarea::-webkit-scrollbar-track {
      background: #1a202c;
      border-radius: 8px;
    }
    textarea::-webkit-scrollbar-thumb {
      background: #4a5568;
      border-radius: 8px;
    }
    textarea::-webkit-scrollbar-thumb:hover {
      background: #718096;
    }
  `]
})
export class ApiRunnerComponent {
  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<any>();

  jsonPayload = '';
  error = '';

  run() {
    this.error = '';
    try {
      if (!this.jsonPayload.trim()) {
        this.error = 'Please enter a JSON payload';
        return;
      }

      const parsed = JSON.parse(this.jsonPayload);
      
      // If it's a full Switchboard payload, extract "elements"
      const overwrites = parsed.elements || parsed;
      
      this.apply.emit(overwrites);
      this.close.emit();
    } catch (e: any) {
      this.error = 'Invalid JSON: ' + e.message;
    }
  }
}
