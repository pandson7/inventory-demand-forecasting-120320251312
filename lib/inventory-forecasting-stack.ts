import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class InventoryForecastingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = '120320251312';

    // S3 Bucket for file storage
    const bucket = new s3.Bucket(this, `InventoryBucket${suffix}`, {
      bucketName: `inventory-forecasting-${suffix}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 3000
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // DynamoDB Tables
    const productsTable = new dynamodb.Table(this, `ProductsTable${suffix}`, {
      tableName: `Products${suffix}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    productsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      readCapacity: 5,
      writeCapacity: 5
    });

    const salesDataTable = new dynamodb.Table(this, `SalesDataTable${suffix}`, {
      tableName: `SalesData${suffix}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const forecastsTable = new dynamodb.Table(this, `ForecastsTable${suffix}`, {
      tableName: `Forecasts${suffix}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // IAM Role for Lambda functions
    const lambdaRole = new iam.Role(this, `LambdaRole${suffix}`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [
                productsTable.tableArn,
                salesDataTable.tableArn,
                forecastsTable.tableArn,
                `${productsTable.tableArn}/index/*`,
                `${salesDataTable.tableArn}/index/*`,
                `${forecastsTable.tableArn}/index/*`
              ]
            })
          ]
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject'
              ],
              resources: [`${bucket.bucketArn}/*`]
            })
          ]
        }),
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel'
              ],
              resources: [
                `arn:aws:bedrock:us-east-1:${this.account}:inference-profile/global.anthropic.claude-sonnet-4-20250514-v1:0`,
                `arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`
              ]
            })
          ]
        })
      }
    });

    // Lambda Functions
    const productManagementFunction = new lambda.Function(this, `ProductManagement${suffix}`, {
      functionName: `ProductManagement${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/product-management'),
      role: lambdaRole,
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        BUCKET_NAME: bucket.bucketName
      },
      timeout: cdk.Duration.seconds(30)
    });

    const salesDataFunction = new lambda.Function(this, `SalesDataManagement${suffix}`, {
      functionName: `SalesDataManagement${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/sales-data'),
      role: lambdaRole,
      environment: {
        SALES_DATA_TABLE: salesDataTable.tableName,
        BUCKET_NAME: bucket.bucketName
      },
      timeout: cdk.Duration.seconds(30)
    });

    const forecastingFunction = new lambda.Function(this, `ForecastingService${suffix}`, {
      functionName: `ForecastingService${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/forecasting'),
      role: lambdaRole,
      environment: {
        SALES_DATA_TABLE: salesDataTable.tableName,
        FORECASTS_TABLE: forecastsTable.tableName,
        PRODUCTS_TABLE: productsTable.tableName,
        AWS_ACCOUNT_ID: this.account
      },
      timeout: cdk.Duration.seconds(60)
    });

    // API Gateway
    const api = new apigateway.RestApi(this, `InventoryForecastingAPI${suffix}`, {
      restApiName: `InventoryForecastingAPI${suffix}`,
      description: 'API for Inventory Demand Forecasting',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    // API Resources and Methods
    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(productManagementFunction));
    productsResource.addMethod('POST', new apigateway.LambdaIntegration(productManagementFunction));
    
    const productResource = productsResource.addResource('{id}');
    productResource.addMethod('GET', new apigateway.LambdaIntegration(productManagementFunction));
    productResource.addMethod('PUT', new apigateway.LambdaIntegration(productManagementFunction));
    productResource.addMethod('DELETE', new apigateway.LambdaIntegration(productManagementFunction));

    const salesDataResource = api.root.addResource('sales-data');
    salesDataResource.addMethod('POST', new apigateway.LambdaIntegration(salesDataFunction));
    salesDataResource.addMethod('GET', new apigateway.LambdaIntegration(salesDataFunction));
    
    const uploadResource = salesDataResource.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(salesDataFunction));

    const forecastsResource = api.root.addResource('forecasts');
    forecastsResource.addMethod('POST', new apigateway.LambdaIntegration(forecastingFunction));
    forecastsResource.addMethod('GET', new apigateway.LambdaIntegration(forecastingFunction));
    
    const forecastResource = forecastsResource.addResource('{productId}');
    forecastResource.addMethod('GET', new apigateway.LambdaIntegration(forecastingFunction));

    // Outputs
    new cdk.CfnOutput(this, 'APIGatewayURL', {
      value: api.url,
      description: 'API Gateway URL'
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'S3 Bucket Name'
    });
  }
}
