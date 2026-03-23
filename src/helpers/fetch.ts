import nodeFetch from 'node-fetch';
import { type Page } from 'puppeteer';
import { createSafeInPageFetchError, sanitizeExternalServiceMessage, sanitizeUrlForLogs } from './safe-error';

const JSON_CONTENT_TYPE = 'application/json';

function getJsonHeaders() {
  return {
    Accept: JSON_CONTENT_TYPE,
    'Content-Type': JSON_CONTENT_TYPE,
  };
}

export async function fetchGet<TResult>(url: string, extraHeaders: Record<string, any>): Promise<TResult> {
  let headers = getJsonHeaders();
  if (extraHeaders) {
    headers = Object.assign(headers, extraHeaders);
  }
  const request = {
    method: 'GET',
    headers,
  };
  const fetchResult = await nodeFetch(url, request);

  if (fetchResult.status !== 200) {
    throw new Error(`request to institute server failed with HTTP ${fetchResult.status} (${sanitizeUrlForLogs(url)})`);
  }

  return fetchResult.json();
}

export async function fetchPost<TResult = any>(
  url: string,
  data: Record<string, any>,
  extraHeaders: Record<string, any> = {},
): Promise<TResult> {
  const request = {
    method: 'POST',
    headers: { ...getJsonHeaders(), ...extraHeaders },
    body: JSON.stringify(data),
  };
  const result = await nodeFetch(url, request);
  return result.json();
}

export async function fetchGraphql<TResult>(
  url: string,
  query: string,
  variables: Record<string, unknown> = {},
  extraHeaders: Record<string, any> = {},
): Promise<TResult> {
  const result = await fetchPost(url, { operationName: null, query, variables }, extraHeaders);
  if (result.errors?.length) {
    const raw = result.errors[0]?.message;
    throw new Error(sanitizeExternalServiceMessage(raw));
  }
  return result.data as Promise<TResult>;
}

export async function fetchGetWithinPage<TResult>(
  page: Page,
  url: string,
  ignoreErrors = false,
): Promise<TResult | null> {
  const [result, status] = await page.evaluate(async innerUrl => {
    let response: Response | undefined;
    try {
      response = await fetch(innerUrl, { credentials: 'include' });
      if (response.status === 204) {
        return [null, response.status] as const;
      }
      return [await response.text(), response.status] as const;
    } catch {
      const noHash = innerUrl.split('#')[0] ?? innerUrl;
      const where = noHash.split('?')[0];
      throw new Error(`fetchGetWithinPage: network error for ${where} (status=${response?.status ?? 'n/a'})`);
    }
  }, url);
  if (result !== null) {
    try {
      return JSON.parse(result);
    } catch (e) {
      if (!ignoreErrors) {
        throw createSafeInPageFetchError('fetchGetWithinPage', url, 'parse', status);
      }
    }
  }
  return null;
}

export async function fetchPostWithinPage<TResult>(
  page: Page,
  url: string,
  data: Record<string, any>,
  extraHeaders: Record<string, any> = {},
  ignoreErrors = false,
): Promise<TResult | null> {
  const result = await page.evaluate(
    async (innerUrl: string, innerData: Record<string, any>, innerExtraHeaders: Record<string, any>) => {
      const response = await fetch(innerUrl, {
        method: 'POST',
        body: JSON.stringify(innerData),
        credentials: 'include',
        // eslint-disable-next-line prefer-object-spread
        headers: Object.assign(
          { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          innerExtraHeaders,
        ),
      });
      if (response.status === 204) {
        return null;
      }
      return response.text();
    },
    url,
    data,
    extraHeaders,
  );

  try {
    if (result !== null) {
      return JSON.parse(result);
    }
  } catch {
    if (!ignoreErrors) {
      throw new Error(`fetchPostWithinPage: JSON parse failed for ${sanitizeUrlForLogs(url)}`);
    }
  }
  return null;
}
