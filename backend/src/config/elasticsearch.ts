import { Client } from '@elastic/elasticsearch';
import { config } from './index.js';

let esClient: Client | null = null;

export function getElasticsearchClient() {
  if (!esClient) {
    esClient = new Client({ node: config.ELASTICSEARCH_URL });
  }
  return esClient;
}
