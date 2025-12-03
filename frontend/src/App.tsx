import React, { useState } from 'react';
import './App.css';
import ProductManagement from './components/ProductManagement';
import SalesDataUpload from './components/SalesDataUpload';
import ForecastingDashboard from './components/ForecastingDashboard';

function App() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="App">
      <header className="App-header">
        <h1>Inventory Demand Forecasting MVP</h1>
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            Product Management
          </button>
          <button 
            className={activeTab === 'sales' ? 'active' : ''}
            onClick={() => setActiveTab('sales')}
          >
            Sales Data
          </button>
          <button 
            className={activeTab === 'forecasting' ? 'active' : ''}
            onClick={() => setActiveTab('forecasting')}
          >
            Forecasting
          </button>
        </nav>
      </header>

      <main className="App-main">
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'sales' && <SalesDataUpload />}
        {activeTab === 'forecasting' && <ForecastingDashboard />}
      </main>
    </div>
  );
}

export default App;
