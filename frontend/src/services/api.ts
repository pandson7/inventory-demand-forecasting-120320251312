const API_BASE_URL = 'https://ztz6k8role.execute-api.us-east-1.amazonaws.com/prod';

export interface Product {
  product_id: string;
  name: string;
  category: string;
  current_price: number;
  created_at?: string;
  updated_at?: string;
}

export interface SalesRecord {
  product_id: string;
  date: string;
  quantity_sold: number;
  price: number;
  revenue?: number;
}

export interface ForecastData {
  forecast_summary: {
    total_predicted_demand: number;
    average_daily_demand: number;
    confidence_level: number;
    trend: string;
    seasonality_detected: boolean;
  };
  daily_forecasts: Array<{
    date: string;
    predicted_demand: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
  }>;
  recommendations: {
    reorder_point: number;
    safety_stock: number;
    recommended_order_quantity: number;
    justification: string;
  };
  model_insights: {
    key_patterns: string[];
    risk_factors: string[];
    accuracy_estimate: number;
  };
}

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Product Management
  async getProducts(): Promise<{ products: Product[] }> {
    return this.request('/products');
  }

  async createProduct(product: Omit<Product, 'created_at' | 'updated_at'>): Promise<{ message: string; product: Product }> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<{ message: string; product: Product }> {
    return this.request(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProduct(productId: string): Promise<{ message: string }> {
    return this.request(`/products/${productId}`, {
      method: 'DELETE',
    });
  }

  // Sales Data Management
  async uploadSalesData(csvData: string, filename?: string): Promise<{ message: string; processed: number; errors: number; errorDetails: string[] }> {
    return this.request('/sales-data/upload', {
      method: 'POST',
      body: JSON.stringify({ csvData, filename }),
    });
  }

  async getSalesDataSummary(): Promise<{ summary: any }> {
    return this.request('/sales-data');
  }

  async getSalesDataForProduct(productId: string): Promise<{ salesData: SalesRecord[] }> {
    return this.request(`/sales-data?product_id=${productId}`);
  }

  // Forecasting
  async generateForecast(productId: string, forecastDays: number = 30): Promise<{ message: string; forecast: ForecastData; metadata: any }> {
    return this.request('/forecasts', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, forecast_days: forecastDays }),
    });
  }

  async getForecast(productId: string): Promise<{ forecast: any }> {
    return this.request(`/forecasts/${productId}`);
  }
}

export const apiService = new ApiService();
