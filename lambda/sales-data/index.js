const { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3 = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    };

    try {
        const method = event.httpMethod;
        const path = event.path;

        switch (method) {
            case 'OPTIONS':
                return { statusCode: 200, headers, body: '' };

            case 'POST':
                if (path.includes('/upload')) {
                    return await uploadSalesData(JSON.parse(event.body), headers);
                } else {
                    return await addSalesRecord(JSON.parse(event.body), headers);
                }

            case 'GET':
                const queryParams = event.queryStringParameters || {};
                if (queryParams.product_id) {
                    return await getSalesDataForProduct(queryParams.product_id, headers);
                } else {
                    return await getSalesDataSummary(headers);
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

async function uploadSalesData(requestBody, headers) {
    const { csvData, filename } = requestBody;

    if (!csvData) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'CSV data is required' })
        };
    }

    try {
        // Parse CSV data
        const lines = csvData.split('\n').filter(line => line.trim());
        const headerLine = lines[0];
        const dataLines = lines.slice(1);

        if (!headerLine || dataLines.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid CSV format' })
            };
        }

        const headers_csv = headerLine.split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['product_id', 'date', 'quantity_sold', 'price'];
        
        const missingHeaders = requiredHeaders.filter(h => !headers_csv.includes(h));
        if (missingHeaders.length > 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `Missing required headers: ${missingHeaders.join(', ')}`,
                    expected: requiredHeaders,
                    found: headers_csv
                })
            };
        }

        // Process each row
        const processedRecords = [];
        const errors = [];

        for (let i = 0; i < dataLines.length; i++) {
            const values = dataLines[i].split(',').map(v => v.trim());
            
            if (values.length !== headers_csv.length) {
                errors.push(`Row ${i + 2}: Column count mismatch`);
                continue;
            }

            const record = {};
            headers_csv.forEach((header, index) => {
                record[header] = values[index];
            });

            // Validate required fields
            if (!record.product_id || !record.date || !record.quantity_sold || !record.price) {
                errors.push(`Row ${i + 2}: Missing required data`);
                continue;
            }

            // Validate data types
            const quantitySold = Number(record.quantity_sold);
            const price = Number(record.price);
            
            if (isNaN(quantitySold) || isNaN(price)) {
                errors.push(`Row ${i + 2}: Invalid numeric values`);
                continue;
            }

            const salesRecord = {
                PK: `SALES#${record.product_id}`,
                SK: `DATE#${record.date}`,
                product_id: record.product_id,
                date: record.date,
                quantity_sold: quantitySold,
                price: price,
                revenue: quantitySold * price,
                created_at: new Date().toISOString()
            };

            processedRecords.push(salesRecord);
        }

        // Store valid records in DynamoDB
        for (const record of processedRecords) {
            const params = {
                TableName: process.env.SALES_DATA_TABLE,
                Item: marshall(record)
            };
            await dynamodb.send(new PutItemCommand(params));
        }

        // Store original file in S3
        if (filename) {
            const s3Params = {
                Bucket: process.env.BUCKET_NAME,
                Key: `uploads/${Date.now()}-${filename}`,
                Body: csvData,
                ContentType: 'text/csv'
            };
            await s3.send(new PutObjectCommand(s3Params));
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Sales data uploaded successfully',
                processed: processedRecords.length,
                errors: errors.length,
                errorDetails: errors
            })
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to process CSV data', details: error.message })
        };
    }
}

async function addSalesRecord(recordData, headers) {
    const { product_id, date, quantity_sold, price } = recordData;

    if (!product_id || !date || !quantity_sold || !price) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing required fields: product_id, date, quantity_sold, price' })
        };
    }

    const salesRecord = {
        PK: `SALES#${product_id}`,
        SK: `DATE#${date}`,
        product_id,
        date,
        quantity_sold: Number(quantity_sold),
        price: Number(price),
        revenue: Number(quantity_sold) * Number(price),
        created_at: new Date().toISOString()
    };

    const params = {
        TableName: process.env.SALES_DATA_TABLE,
        Item: marshall(salesRecord)
    };

    await dynamodb.send(new PutItemCommand(params));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Sales record created successfully', record: salesRecord })
    };
}

async function getSalesDataForProduct(productId, headers) {
    const params = {
        TableName: process.env.SALES_DATA_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: marshall({
            ':pk': `SALES#${productId}`
        })
    };

    const result = await dynamodb.send(new QueryCommand(params));
    const salesData = result.Items.map(item => unmarshall(item));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ salesData })
    };
}

async function getSalesDataSummary(headers) {
    const params = {
        TableName: process.env.SALES_DATA_TABLE
    };

    const result = await dynamodb.send(new ScanCommand(params));
    const allSalesData = result.Items.map(item => unmarshall(item));

    const summary = {
        totalRecords: allSalesData.length,
        totalRevenue: allSalesData.reduce((sum, record) => sum + (record.revenue || 0), 0),
        uniqueProducts: new Set(allSalesData.map(record => record.product_id)).size,
        dateRange: {
            earliest: allSalesData.length > 0 ? Math.min(...allSalesData.map(r => new Date(r.date).getTime())) : null,
            latest: allSalesData.length > 0 ? Math.max(...allSalesData.map(r => new Date(r.date).getTime())) : null
        }
    };

    if (summary.dateRange.earliest) {
        summary.dateRange.earliest = new Date(summary.dateRange.earliest).toISOString().split('T')[0];
        summary.dateRange.latest = new Date(summary.dateRange.latest).toISOString().split('T')[0];
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ summary })
    };
}
