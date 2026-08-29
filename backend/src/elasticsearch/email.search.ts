import { getElasticsearchClient } from '../config/elasticsearch.js';
import { logger } from '../config/logger.js';

const INDEX_NAME = 'emails';

export async function initializeEmailIndex(): Promise<void> {
  try {
    const es = getElasticsearchClient();
    const exists = await es.indices.exists({ index: INDEX_NAME });

    if (!exists) {
      await es.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            recipient: { type: 'text' },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      logger.info({ message: 'Elasticsearch emails index created successfully' });
    }
  } catch (error: any) {
    logger.warn({
      message: 'Elasticsearch index initialization warning (continuing without ES)',
      error: error.message || error,
    });
  }
}

export async function indexEmailDocument(email: {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}): Promise<void> {
  try {
    const es = getElasticsearchClient();
    await es.index({
      index: INDEX_NAME,
      id: email.id,
      document: {
        id: email.id,
        userId: email.userId,
        senderId: email.senderId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        createdAt: email.createdAt.toISOString(),
      },
    });
    logger.debug({ message: 'Email indexed in Elasticsearch', emailId: email.id });
  } catch (error: any) {
    logger.warn({
      message: 'Failed to index email document in Elasticsearch (worker safe)',
      emailId: email.id,
      error: error.message || error,
    });
  }
}

export async function updateEmailDocumentStatus(
  emailId: string,
  status: string,
  sentAt?: Date | null
): Promise<void> {
  try {
    const es = getElasticsearchClient();
    await es.update({
      index: INDEX_NAME,
      id: emailId,
      doc: {
        status,
        sentAt: sentAt ? sentAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    logger.warn({
      message: 'Failed to update email status in Elasticsearch',
      emailId,
      error: error.message || error,
    });
  }
}

export async function searchUserEmails(
  userId: string,
  query: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const es = getElasticsearchClient();
    const from = (page - 1) * limit;

    const response = await es.search({
      index: INDEX_NAME,
      from,
      size: limit,
      query: {
        bool: {
          must: [
            { term: { userId } },
            {
              multi_match: {
                query,
                fields: ['recipient^3', 'subject^2', 'body', 'status'],
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      sort: [{ scheduledAt: { order: 'desc' } }],
    });

    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
    const data = response.hits.hits.map((hit: any) => hit._source);

    return { data, total, page, limit };
  } catch (error: any) {
    logger.error({ message: 'Elasticsearch search error', userId, query, error: error.message || error });
    return { data: [], total: 0, page, limit, fallback: true };
  }
}
