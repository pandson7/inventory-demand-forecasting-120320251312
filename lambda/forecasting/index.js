const { DynamoDBClient, QueryCommand, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    };

    try {
        const method = event.httpMethod;
        const pathParameters = event.pathParameters;

        switch (method) {
            case 'OPTIONS':
                return { statusCode: 200, headers, body: '' };

            case 'POST':
                return await generateForecast(JSON.parse(event.body), headers);

            case 'GET':
                if (pathParameters && pathParameters.productId) {
                    return await getForecast(pathParameters.productId, headers);
                } else {
                    return await getAllForecasts(headers);
                }

            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};

async function generateForecast(requestBody, headers) {
    const { product_id, forecast_days = 30 } = requestBody;

    if (!product_id) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'product_id is required' })
        };
    }

    try {
        // Get historical sales data
        const salesParams = {
            TableName: process.env.SALES_DATA_TABLE,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: marshall({
                ':pk': `SALES#${product_id}`
            })
        };

        const salesResult = await dynamodb.send(new QueryCommand(salesParams));
        const salesData = salesResult.Items.map(item => unmarshall(item));

        if (salesData.length < 7) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Insufficient historical data',
                    message: 'At least 7 days of sales data required for forecasting',
                    currentDataPoints: salesData.length
                })
            };
        }

        // Get product information
        const productParams = {
            TableName: process.env.PRODUCTS_TABLE,
            Key: marshall({
                PK: `PRODUCT#${product_id}`,
                SK: 'METADATA'
            })
        };

        const productResult = await dynamodb.send(new GetItemCommand(productParams));
        const product = productResult.Item ? unmarshall(productResult.Item) : null;

        // Prepare data for AI analysis
        const sortedSalesData = salesData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const prompt = `Analyze the following sales data and generate a demand forecast:

Product Information:
- Product ID: ${product_id}
- Product Name: ${product?.name || 'Unknown'}
- Category: ${product?.category || 'Unknown'}
- Current Price: $${product?.current_price || 'Unknown'}

Historical Sales Data (${sortedSalesData.length} data points):
${sortedSalesData.map(d => `Date: ${d.date}, Quantity Sold: ${d.quantity_sold}, Revenue: $${d.revenue.toFixed(2)}`).join('\n')}

Please provide a ${forecast_days}-day demand forecast in the following JSON format:
{
  "forecast_summary": {
    "total_predicted_demand": number,
    "average_daily_demand": number,
    "confidence_level": number (0-100),
    "trend": "increasing|decreasing|stable",
    "seasonality_detected": boolean
  },
  "daily_forecasts": [
    {
      "date": "YYYY-MM-DD",
      "predicted_demand": number,
      "confidence_interval": {
        "lower": number,
        "upper": number
      }
    }
  ],
  "recommendations": {
    "reorder_point": number,
    "safety_stock": number,
    "recommended_order_quantity": number,
    "justification": "string explaining the recommendations"
  },
  "model_insights": {
    "key_patterns": ["pattern1", "pattern2"],
    "risk_factors": ["risk1", "risk2"],
    "accuracy_estimate": number (0-100)
  }
}

Base the forecast on historical trends, seasonal patterns, and statistical analysis. Ensure all numbers are realistic and based on the provided data.`;

        // Call Bedrock Claude 4
        const bedrockParams = {
            modelId: 'arn:aws:bedrock:us-east-1:' + process.env.AWS_ACCOUNT_ID + ':inference-profile/global.anthropic.claude-sonnet-4-20250514-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        };

        const bedrockResponse = await bedrock.send(new InvokeModelCommand(bedrockParams));
        const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        
        // Extract JSON from Claude's response (it may be wrapped in markdown)
        let forecastData;
        try {
            const content = responseBody.content[0].text;
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                forecastData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse Bedrock response:', parseError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to parse AI response', details: parseError.message })
            };
        }

        // Store forecast results
        const timestamp = new Date().toISOString();
        const forecastRecord = {
            PK: `FORECAST#${product_id}`,
            SK: `GENERATED#${timestamp}`,
            product_id,
            forecast_data: forecastData,
            generated_at: timestamp,
            forecast_days,
            data_points_used: salesData.length
        };

        const storeParams = {
            TableName: process.env.FORECASTS_TABLE,
            Item: marshall(forecastRecord)
        };

        await dynamodb.send(new PutItemCommand(storeParams));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Forecast generated successfully',
                forecast: forecastData,
                metadata: {
                    product_id,
                    generated_at: timestamp,
                    forecast_days,
                    data_points_used: salesData.length
                }
            })
        };

    } catch (error) {
        console.error('Forecasting error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to generate forecast', details: error.message })
        };
    }
}

async function getForecast(productId, headers) {
    const params = {
        TableName: process.env.FORECASTS_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: marshall({
            ':pk': `FORECAST#${productId}`
        }),
        ScanIndexForward: false, // Get most recent first
        Limit: 1
    };

    const result = await dynamodb.send(new QueryCommand(params));
    
    if (result.Items.length === 0) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'No forecast found for this product' })
        };
    }

    const forecast = unmarshall(result.Items[0]);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ forecast })
    };
}

async function getAllForecasts(headers) {
    const params = {
        TableName: process.env.FORECASTS_TABLE
    };

    const result = await dynamodb.send(new QueryCommand(params));
    const forecasts = result.Items.map(item => unmarshall(item));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ forecasts })
    };
}
