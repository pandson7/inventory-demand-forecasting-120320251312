import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { apiService, Product, ForecastData } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ForecastingDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [forecastDays, setForecastDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiService.getProducts();
      setProducts(response.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const generateForecast = async () => {
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setForecastData(null);

      const response = await apiService.generateForecast(selectedProduct, forecastDays);
      setForecastData(response.forecast);
      setSuccess('Forecast generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!forecastData) return null;

    const labels = forecastData.daily_forecasts.map(f => f.date);
    const predictions = forecastData.daily_forecasts.map(f => f.predicted_demand);
    const upperBounds = forecastData.daily_forecasts.map(f => f.confidence_interval.upper);
    const lowerBounds = forecastData.daily_forecasts.map(f => f.confidence_interval.lower);

    return {
      labels,
      datasets: [
        {
          label: 'Predicted Demand',
          data: predictions,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Upper Confidence',
          data: upperBounds,
          borderColor: 'rgba(255, 99, 132, 0.5)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderDash: [5, 5],
          tension: 0.1,
        },
        {
          label: 'Lower Confidence',
          data: lowerBounds,
          borderColor: 'rgba(255, 99, 132, 0.5)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderDash: [5, 5],
          tension: 0.1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Demand Forecast',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantity',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  };

  return (
    <div className="component-container">
      <h2>Demand Forecasting</h2>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', marginBottom: '20px' }}>
        <div className="form-group">
          <label>Select Product:</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">Choose a product...</option>
            {products.map((product) => (
              <option key={product.product_id} value={product.product_id}>
                {product.name} ({product.product_id})
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Forecast Days:</label>
          <input
            type="number"
            min="7"
            max="365"
            value={forecastDays}
            onChange={(e) => setForecastDays(parseInt(e.target.value))}
          />
        </div>

        <div style={{ alignSelf: 'end' }}>
          <button 
            className="btn btn-primary"
            onClick={generateForecast}
            disabled={loading || !selectedProduct}
          >
            {loading ? 'Generating...' : 'Generate Forecast'}
          </button>
        </div>
      </div>

      {forecastData && (
        <>
          <div className="forecast-summary">
            <div className="summary-card">
              <h3>Total Predicted Demand</h3>
              <div className="value">{forecastData.forecast_summary.total_predicted_demand.toFixed(0)}</div>
            </div>
            <div className="summary-card">
              <h3>Average Daily Demand</h3>
              <div className="value">{forecastData.forecast_summary.average_daily_demand.toFixed(1)}</div>
            </div>
            <div className="summary-card">
              <h3>Confidence Level</h3>
              <div className="value">{forecastData.forecast_summary.confidence_level.toFixed(1)}%</div>
            </div>
            <div className="summary-card">
              <h3>Trend</h3>
              <div className="value">{forecastData.forecast_summary.trend}</div>
            </div>
          </div>

          <div className="chart-container">
            <Line data={getChartData()!} options={chartOptions} />
          </div>

          <div className="component-container">
            <h3>Inventory Recommendations</h3>
            <div className="forecast-summary">
              <div className="summary-card">
                <h3>Reorder Point</h3>
                <div className="value">{forecastData.recommendations.reorder_point.toFixed(0)}</div>
              </div>
              <div className="summary-card">
                <h3>Safety Stock</h3>
                <div className="value">{forecastData.recommendations.safety_stock.toFixed(0)}</div>
              </div>
              <div className="summary-card">
                <h3>Recommended Order Qty</h3>
                <div className="value">{forecastData.recommendations.recommended_order_quantity.toFixed(0)}</div>
              </div>
            </div>
            <div style={{ marginTop: '15px', textAlign: 'left' }}>
              <h4>Justification:</h4>
              <p>{forecastData.recommendations.justification}</p>
            </div>
          </div>

          <div className="component-container">
            <h3>Model Insights</h3>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '15px' }}>
                <h4>Key Patterns:</h4>
                <ul>
                  {forecastData.model_insights.key_patterns.map((pattern, index) => (
                    <li key={index}>{pattern}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <h4>Risk Factors:</h4>
                <ul>
                  {forecastData.model_insights.risk_factors.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Accuracy Estimate:</h4>
                <p>{forecastData.model_insights.accuracy_estimate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </>
      )}

      {loading && <div className="loading">Generating forecast...</div>}
    </div>
  );
};

export default ForecastingDashboard;
