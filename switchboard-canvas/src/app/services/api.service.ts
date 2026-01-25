import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // In production, use the full backend URL. In development, use relative path through proxy
  private baseUrl = environment.production 
    ? `${environment.backendPublicUrl}/api`
    : environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Sync a template design to the API backend
   */
  async syncTemplate(templateData: any): Promise<any> {
    try {
      console.log('📤 Syncing template to:', `${this.baseUrl}/templates/sync`);
      console.log('📦 Template data:', { 
        id: templateData.id, 
        apiName: templateData.apiName,
        displayName: templateData.displayName 
      });
      
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/templates/sync`, templateData)
      );
      
      console.log('✅ Template synced successfully:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Error syncing template:', error);
      if (error.error) {
        console.error('Error details:', error.error);
      }
      throw error;
    }
  }

  /**
   * Get all templates from the backend
   */
  async getAllTemplates(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/templates`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by API name
   */
  async getTemplate(apiName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/templates/${apiName}`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }
}
