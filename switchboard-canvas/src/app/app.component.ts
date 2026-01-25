import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatabaseService } from './services/database.service';
import { FontService } from './services/font.service';
import { NotificationComponent } from './components/notification/notification.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'switchboard-canvas';

  constructor(
    private db: DatabaseService,
    private fontService: FontService
  ) {}

  async ngOnInit() {
    // Test database initialization
    try {
      const templates = await this.db.getAllTemplates();
      console.log('✅ Database initialized successfully!');
      console.log('📁 Templates in database:', templates.length);

      // Initialize fonts
      await this.fontService.syncPublicFonts();
      await this.fontService.loadAllFonts();
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }
}
