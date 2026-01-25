import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: (Notification & { id: number })[] = [];
  private subscription?: Subscription;
  private counter = 0;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscription = this.notificationService.notifications$.subscribe(notification => {
      const id = this.counter++;
      const item = { ...notification, id };
      this.notifications.push(item);

      setTimeout(() => {
        this.remove(id);
      }, notification.duration || 3000);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  remove(id: number) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
}
