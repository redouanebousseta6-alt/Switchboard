import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-api-snippet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-snippet.component.html',
  styleUrl: './api-snippet.component.css'
})
export class ApiSnippetComponent implements OnInit {
  @Input() templateId: string = 'template-1';
  @Input() elements: any = {};
  @Input() canvasWidth: number = 800;
  @Input() canvasHeight: number = 1200;
  @Output() close = new EventEmitter<void>();

  curlCommand: string = '';

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.generateCurl();
  }

  generateCurl() {
    const payload = {
      template: this.templateId || 'your-template-id',
      sizes: [
        {
          width: this.canvasWidth,
          height: this.canvasHeight
        }
      ],
      elements: this.elements
    };

    const jsonString = JSON.stringify(payload, null, 2);
    
    // Use the backend URL from the environment
    const apiUrl = `${environment.backendPublicUrl}/api/v1/generate`;
    
    this.curlCommand = `curl --request POST \\
  --url ${apiUrl} \\
  --header 'Content-Type: application/json' \\
  --data '${jsonString}'`;
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.curlCommand).then(() => {
      this.notificationService.success('cURL command copied to clipboard!');
    }).catch(err => {
      this.notificationService.error('Failed to copy to clipboard');
    });
  }
}
