import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Sync a template design to the API backend
   */
  async syncTemplate(templateData: any): Promise<any> {
    try {
      return await firstValueFrom(
        this.http.post(`${this.baseUrl}/templates/sync`, templateData)
      );
    } catch (error) {
      console.error('Error syncing template:', error);
      throw error;
    }
  }
}
