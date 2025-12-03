#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InventoryForecastingStack } from '../lib/inventory-forecasting-stack';

const app = new cdk.App();
new InventoryForecastingStack(app, 'InventoryForecastingStack120320251312', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
