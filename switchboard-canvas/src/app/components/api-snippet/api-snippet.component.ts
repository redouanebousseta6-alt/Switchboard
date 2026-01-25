import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

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
    
    // Updated to use the local backend URL we just created
    this.curlCommand = `curl --request POST \\
  --url http://localhost:3000/api/v1/generate \\
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
