/**
 * Website Fetcher Utility
 * Fetches and extracts customer information from company websites using backend crawler
 * German/EU-aware business data extraction (Impressum, VAT, HRB, etc.)
 */

import { request } from './request';

/**
 * Fetch customer information from a website using backend crawler
 * @param {string} url - The website URL to fetch
 * @returns {Promise<object>} - Extracted company information with structure matching CompanyInfo
 */
export async function fetchWebsiteInfo(url) {
  // Validate URL
  if (!url) {
    throw new Error('URL is required');
  }

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    // Validate URL format
    new URL(normalizedUrl);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  try {
    // TODO: Implement backend crawler API call
    // Use backend crawler API
    // Note: request() already prefixes with /api, so just use /crawler/fetch
    // const response = await request('/crawler/fetch', {
    //   method: 'POST',
    //   body: { url: normalizedUrl },
    // });

    // if (!response.success || !response.data) {
    //   throw new Error(response.error || 'Failed to crawl website');
    // }

    // return response.data;

    // Stub implementation for now
    return {
      name: '',
      email: '',
      phone: '',
      address: {}
    };
  } catch (error) {
    console.error('Error fetching website:', error);
    throw new Error(`Failed to fetch website: ${error.message || error}`);
  }
}

/**
 * Search for company information by name (placeholder for future implementation)
 * @param {string} companyName - The company name to search for
 * @returns {Promise<object>} - Found website URL and extracted content
 */
export async function searchCompanyInfo(companyName) {
  if (!companyName || companyName.trim().length === 0) {
    throw new Error('Company name is required');
  }

  // For now, search functionality is not implemented in backend
  // User should use direct URL mode
  throw new Error('Company search not yet implemented. Please use Direct URL mode with the company website.');
}

/**
 * Validate website URL
 */
export function validateWebsiteUrl(url) {
  if (!url || url.trim().length === 0) {
    return { valid: false, error: 'URL is required' };
  }

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const urlObj = new URL(normalizedUrl);

    // Check if it has a valid domain
    if (!urlObj.hostname.includes('.')) {
      return { valid: false, error: 'Invalid domain name' };
    }

    return { valid: true, value: normalizedUrl };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}
