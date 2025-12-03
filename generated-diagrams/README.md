# AWS Architecture Diagrams - Inventory Demand Forecasting MVP

This directory contains comprehensive AWS architecture diagrams for the Inventory Demand Forecasting MVP system. The diagrams illustrate different aspects of the serverless architecture designed for scalable demand prediction capabilities.

## Generated Diagrams

### 1. Main Architecture Overview (`inventory-forecasting-architecture.png`)
**Purpose**: High-level system architecture showing all major AWS components and their relationships.

**Components**:
- **Frontend**: Business user interface
- **API Gateway**: REST API endpoint management
- **Lambda Functions**: Serverless compute for business logic
  - Upload Sales Data
  - Manage Products
  - Generate Forecast
  - Generate Reports
- **DynamoDB**: NoSQL database for all data storage
- **S3**: Object storage for files and reports
- **Amazon Bedrock**: AI/ML service for demand forecasting
- **CloudWatch**: Monitoring and logging

**Key Features**:
- Serverless architecture for cost optimization
- Scalable compute with Lambda functions
- Managed database with DynamoDB
- AI-powered forecasting with Bedrock

### 2. Data Flow Architecture (`data-flow-architecture.png`)
**Purpose**: Detailed view of data movement and processing flows through the system.

**Data Flow Patterns**:
- **User Input**: React application → API Gateway → Lambda functions
- **Data Storage**: Lambda functions → DynamoDB tables (SalesData, Products, Forecasts)
- **AI Processing**: Forecast Lambda → Bedrock → Forecasts table
- **File Storage**: Report Lambda → S3 bucket
- **Monitoring**: All Lambda functions → CloudWatch Logs

**DynamoDB Tables**:
- `SalesData`: Historical sales records with partition key `SALES#<product_id>`
- `Products`: Product catalog with partition key `PRODUCT#<product_id>`
- `Forecasts`: Generated predictions with partition key `FORECAST#<product_id>`

### 3. API Architecture (`api-architecture.png`)
**Purpose**: REST API design showing endpoints, methods, and Lambda function mappings.

**API Endpoints**:

#### Product Management (`/products`)
- `GET /products` - List all products
- `POST /products` - Create new product
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product

#### Sales Data Management (`/sales-data`)
- `POST /sales-data/upload` - Upload CSV sales data
- `GET /sales-data/{product_id}` - Get sales history
- `GET /sales-data/summary` - Get data summary statistics

#### Forecasting (`/forecasts`)
- `POST /forecasts/generate` - Generate demand forecast
- `GET /forecasts/{product_id}` - Get forecast results
- `GET /forecasts/{product_id}/accuracy` - Get model accuracy metrics

#### Reporting (`/reports`)
- `GET /reports/forecast-summary` - Generate forecast summary report
- `GET /reports/inventory-recommendations` - Get inventory recommendations

### 4. Security & Monitoring Architecture (`security-monitoring-architecture.png`)
**Purpose**: Security controls, encryption, and observability components.

**Security Features**:
- **API Key Authentication**: Secure API access control
- **IAM Roles & Policies**: Least privilege access for Lambda functions
- **KMS Encryption**: Data encryption at rest for DynamoDB and S3
- **HTTPS/TLS**: Encrypted data in transit

**Monitoring & Observability**:
- **CloudWatch Metrics**: Performance and usage metrics
- **CloudWatch Logs**: Application and system logs
- **CloudWatch Alarms**: Automated alerting for critical issues
- **Structured Logging**: JSON format with correlation IDs

## Architecture Principles

### Serverless Design
- **No server management**: All compute runs on managed services
- **Auto-scaling**: Lambda and DynamoDB scale automatically
- **Pay-per-use**: Cost optimization through usage-based pricing

### Security Best Practices
- **Encryption everywhere**: Data encrypted at rest and in transit
- **Principle of least privilege**: Minimal IAM permissions
- **API security**: Key-based authentication with rate limiting

### Scalability & Performance
- **Horizontal scaling**: Lambda functions scale to handle concurrent requests
- **Database optimization**: DynamoDB with proper partition and sort keys
- **Caching strategy**: API Gateway caching for frequently accessed data

### Monitoring & Reliability
- **Comprehensive logging**: All services log to CloudWatch
- **Error handling**: Graceful degradation and retry mechanisms
- **Performance monitoring**: Real-time metrics and alerting

## Data Models

### SalesData Table Structure
```json
{
  "PK": "SALES#<product_id>",
  "SK": "DATE#<date>",
  "product_id": "string",
  "date": "string (ISO 8601)",
  "quantity_sold": "number",
  "revenue": "number",
  "price": "number",
  "created_at": "string"
}
```

### Products Table Structure
```json
{
  "PK": "PRODUCT#<product_id>",
  "SK": "METADATA",
  "product_id": "string",
  "name": "string",
  "category": "string",
  "current_price": "number",
  "created_at": "string",
  "updated_at": "string"
}
```

### Forecasts Table Structure
```json
{
  "PK": "FORECAST#<product_id>",
  "SK": "DATE#<forecast_date>",
  "product_id": "string",
  "forecast_date": "string",
  "predicted_demand": "number",
  "confidence_interval": "object",
  "model_accuracy": "number",
  "created_at": "string"
}
```

## Technology Stack

### Frontend
- **React.js**: Modern web application framework
- **Chart.js**: Data visualization for forecasts and reports
- **Responsive design**: Mobile-friendly interface

### Backend Services
- **API Gateway**: REST API management and routing
- **Lambda (Node.js)**: Serverless business logic
- **DynamoDB**: NoSQL database with on-demand scaling
- **S3**: Object storage for files and reports

### AI/ML
- **Amazon Bedrock**: Claude 4 LLM for demand forecasting
- **Time series analysis**: Pattern recognition in sales data
- **Confidence intervals**: Prediction accuracy metrics

### DevOps & Monitoring
- **AWS CDK**: Infrastructure as Code (TypeScript)
- **CloudWatch**: Comprehensive monitoring and logging
- **IAM**: Security and access management

## Deployment Strategy

### Single Environment
- **Development environment**: All resources in us-east-1 region
- **Local development**: React dev server for frontend
- **Automated deployment**: CDK for infrastructure provisioning

### Cost Optimization
- **On-demand pricing**: DynamoDB and Lambda scale to zero
- **S3 lifecycle policies**: Automated data archiving
- **CloudWatch log retention**: Configurable log retention periods

## Integration Points

### External Dependencies
- **AWS SDK**: JavaScript SDK for Lambda functions
- **CSV parsing**: Data upload and processing libraries
- **Chart libraries**: Frontend data visualization

### Internal Communication
- **Synchronous**: API Gateway → Lambda (REST calls)
- **Direct SDK**: Lambda → DynamoDB/S3/Bedrock
- **Event-driven**: Future enhancement for real-time processing

## Performance Considerations

### Optimization Strategies
- **Lambda memory tuning**: Right-sized memory allocation
- **DynamoDB query optimization**: Efficient partition and sort key usage
- **API Gateway caching**: Reduced latency for frequent requests
- **Connection pooling**: Reused database connections in Lambda

### Scalability Limits
- **Lambda concurrency**: 1000 concurrent executions (default)
- **API Gateway**: 10,000 requests per second
- **DynamoDB**: 40,000 read/write capacity units on-demand
- **S3**: Virtually unlimited storage capacity

This architecture provides a solid foundation for the Inventory Demand Forecasting MVP with room for future enhancements and scaling.
