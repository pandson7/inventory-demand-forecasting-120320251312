const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

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
        const pathParameters = event.pathParameters;

        switch (method) {
            case 'OPTIONS':
                return { statusCode: 200, headers, body: '' };

            case 'GET':
                if (pathParameters && pathParameters.id) {
                    return await getProduct(pathParameters.id, headers);
                } else {
                    return await getAllProducts(headers);
                }

            case 'POST':
                return await createProduct(JSON.parse(event.body), headers);

            case 'PUT':
                if (pathParameters && pathParameters.id) {
                    return await updateProduct(pathParameters.id, JSON.parse(event.body), headers);
                }
                break;

            case 'DELETE':
                if (pathParameters && pathParameters.id) {
                    return await deleteProduct(pathParameters.id, headers);
                }
                break;

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

async function getAllProducts(headers) {
    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: marshall({
            ':sk': 'METADATA'
        })
    };

    const result = await dynamodb.send(new ScanCommand(params));
    const products = result.Items.map(item => unmarshall(item));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ products })
    };
}

async function getProduct(productId, headers) {
    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        Key: marshall({
            PK: `PRODUCT#${productId}`,
            SK: 'METADATA'
        })
    };

    const result = await dynamodb.send(new GetItemCommand(params));
    
    if (!result.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Product not found' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ product: unmarshall(result.Item) })
    };
}

async function createProduct(productData, headers) {
    const { product_id, name, category, current_price } = productData;

    if (!product_id || !name || !category || !current_price) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing required fields: product_id, name, category, current_price' })
        };
    }

    const timestamp = new Date().toISOString();
    const item = {
        PK: `PRODUCT#${product_id}`,
        SK: 'METADATA',
        product_id,
        name,
        category,
        current_price: Number(current_price),
        created_at: timestamp,
        updated_at: timestamp
    };

    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        Item: marshall(item)
    };

    await dynamodb.send(new PutItemCommand(params));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Product created successfully', product: item })
    };
}

async function updateProduct(productId, updateData, headers) {
    const timestamp = new Date().toISOString();
    const { name, category, current_price } = updateData;

    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name) {
        updateExpression.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = name;
    }

    if (category) {
        updateExpression.push('category = :category');
        expressionAttributeValues[':category'] = category;
    }

    if (current_price !== undefined) {
        updateExpression.push('current_price = :price');
        expressionAttributeValues[':price'] = Number(current_price);
    }

    updateExpression.push('updated_at = :updated_at');
    expressionAttributeValues[':updated_at'] = timestamp;

    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        Key: marshall({
            PK: `PRODUCT#${productId}`,
            SK: 'METADATA'
        }),
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.send(new UpdateItemCommand(params));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Product updated successfully', product: unmarshall(result.Attributes) })
    };
}

async function deleteProduct(productId, headers) {
    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        Key: marshall({
            PK: `PRODUCT#${productId}`,
            SK: 'METADATA'
        })
    };

    await dynamodb.send(new DeleteItemCommand(params));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Product deleted successfully' })
    };
}
