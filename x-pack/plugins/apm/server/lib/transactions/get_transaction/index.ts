/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from 'x-pack/plugins/apm/common/elasticsearch_fieldnames';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { rangeFilter } from '../../helpers/range_filter';
import { Setup } from '../../helpers/setup_request';

export type TransactionAPIResponse = Transaction | undefined;

export interface TransactionWithErrorCountAPIResponse {
  transaction: TransactionAPIResponse;
  errorCount: number;
}

export async function getTransaction(
  transactionId: string,
  traceId: string,
  setup: Setup
): Promise<TransactionAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [TRANSACTION_ID]: transactionId } },
    { term: { [TRACE_ID]: traceId } },
    { range: rangeFilter(start, end) }
  ];

  if (esFilterQuery) {
    filter.push(esFilterQuery);
  }

  const params = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 1,
      query: {
        bool: {
          filter
        }
      }
    }
  };

  const resp = await client<Transaction>('search', params);
  return idx(resp, _ => _.hits.hits[0]._source);
}
