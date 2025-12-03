# Inventory Demand Forecasting System

A comprehensive AWS-based inventory demand forecasting system that leverages machine learning to predict future inventory needs and optimize supply chain management.

## Overview

This system provides intelligent inventory forecasting capabilities using AWS services including Lambda, DynamoDB, API Gateway, and SageMaker. It features a modern React frontend for data visualization and management.

## Architecture

The system consists of:

- **AWS CDK Infrastructure**: Complete infrastructure as code
- **Lambda Functions**: Serverless compute for data processing and forecasting
- **DynamoDB**: NoSQL database for storing inventory and sales data
- **API Gateway**: RESTful API endpoints
- **React Frontend**: Modern web interface with Chart.js visualizations
- **SageMaker**: Machine learning model for demand forecasting

## Features

- Real-time inventory tracking
- Demand forecasting using machine learning
- Interactive data visualizations
- RESTful API for data management
- Scalable serverless architecture
- Comprehensive monitoring and logging

## Project Structure

```
├── lib/                          # CDK infrastructure code
├── lambda/                       # Lambda function implementations
│   ├── forecasting/             # ML forecasting logic
│   ├── product-management/      # Product CRUD operations
│   └── sales-data/              # Sales data processing
├── frontend/                    # React application
├── specs/                       # Project specifications
├── generated-diagrams/          # Architecture diagrams
├── pricing/                     # Cost analysis
└── cdk.out/                     # CDK synthesis output
```

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI installed
- TypeScript

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install
   ```

3. Deploy infrastructure:
   ```bash
   cdk deploy
   ```

4. Start the frontend:
   ```bash
   cd frontend && npm start
   ```

## API Endpoints

- `GET /products` - List all products
- `POST /products` - Create new product
- `GET /products/{id}` - Get product details
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product
- `POST /sales-data` - Submit sales data
- `GET /forecast/{productId}` - Get demand forecast

## Technologies Used

- **Infrastructure**: AWS CDK, TypeScript
- **Backend**: AWS Lambda, DynamoDB, API Gateway
- **Machine Learning**: AWS SageMaker
- **Frontend**: React, TypeScript, Chart.js, Tailwind CSS
- **Monitoring**: CloudWatch, X-Ray

## Documentation

- [Requirements](specs/requirements.md)
- [System Design](specs/design.md)
- [Implementation Tasks](specs/tasks.md)
- [Architecture Diagrams](generated-diagrams/)
- [Jira Stories Summary](jira-stories-summary.md)

## Cost Estimation

See [pricing analysis](pricing/) for detailed cost breakdown and optimization recommendations.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
