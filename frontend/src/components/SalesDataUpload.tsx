import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const SalesDataUpload: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSalesDataSummary();
      setSummary(response.summary);
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setUploadResult(null);

      const text = await file.text();
      const result = await apiService.uploadSalesData(text, file.name);
      
      setUploadResult(result);
      if (result.errors === 0) {
        setSuccess(`Successfully processed ${result.processed} records`);
      } else {
        setError(`Processed ${result.processed} records with ${result.errors} errors`);
      }
      
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (!csvFile) {
      setError('Please drop a CSV file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setUploadResult(null);

      const text = await csvFile.text();
      const result = await apiService.uploadSalesData(text, csvFile.name);
      
      setUploadResult(result);
      if (result.errors === 0) {
        setSuccess(`Successfully processed ${result.processed} records`);
      } else {
        setError(`Processed ${result.processed} records with ${result.errors} errors`);
      }
      
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="component-container">
      <h2>Sales Data Upload</h2>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="form-group">
        <label>Upload CSV File:</label>
        <div 
          className="file-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>Drag and drop a CSV file here, or click to select</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-input"
          />
          <label htmlFor="file-input" className="btn btn-primary">
            Choose CSV File
          </label>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>CSV Format Requirements:</h3>
        <p>Your CSV file should contain the following columns:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li><strong>product_id</strong> - Unique identifier for the product</li>
          <li><strong>date</strong> - Sale date (YYYY-MM-DD format)</li>
          <li><strong>quantity_sold</strong> - Number of units sold</li>
          <li><strong>price</strong> - Price per unit</li>
        </ul>
      </div>

      {uploadResult && (
        <div className="component-container" style={{ marginTop: '20px' }}>
          <h3>Upload Results</h3>
          <p>Processed: {uploadResult.processed} records</p>
          <p>Errors: {uploadResult.errors}</p>
          {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
            <div>
              <h4>Error Details:</h4>
              <ul style={{ textAlign: 'left' }}>
                {uploadResult.errorDetails.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {summary && (
        <div className="component-container" style={{ marginTop: '20px' }}>
          <h3>Data Summary</h3>
          <div className="forecast-summary">
            <div className="summary-card">
              <h3>Total Records</h3>
              <div className="value">{summary.totalRecords}</div>
            </div>
            <div className="summary-card">
              <h3>Total Revenue</h3>
              <div className="value">${summary.totalRevenue?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="summary-card">
              <h3>Unique Products</h3>
              <div className="value">{summary.uniqueProducts}</div>
            </div>
            <div className="summary-card">
              <h3>Date Range</h3>
              <div className="value">
                {summary.dateRange?.earliest && summary.dateRange?.latest 
                  ? `${summary.dateRange.earliest} to ${summary.dateRange.latest}`
                  : 'No data'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="loading">Processing...</div>}
    </div>
  );
};

export default SalesDataUpload;
