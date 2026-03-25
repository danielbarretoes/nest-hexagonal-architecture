import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config';
import { loadEnvironment } from '../env/load-env';

export function createAppDataSource(): DataSource {
  loadEnvironment();
  return new DataSource(createDatabaseOptions());
}

const appDataSource = createAppDataSource();

export default appDataSource;
