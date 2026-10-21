import axios from 'axios';

export interface QuoteData {
  text: string;
  author: string;
}

/**
 * Fetch a random quote from the Quotable API
 * API: https://api.quotable.io/random
 */
export async function fetchRandomQuoteFromQuotable(): Promise<QuoteData> {
  try {
    const response = await axios.get('https://api.quotable.io/random', {
      timeout: 10000,
    });

    const { content, author } = response.data;

    // Clean up author name (remove ", type.author" suffix if present)
    const cleanAuthor = author.split(',')[0].trim();

    return {
      text: content,
      author: cleanAuthor,
    };
  } catch (error) {
    console.error('[Quotable API] Error fetching quote:', error);
    throw new Error('Failed to fetch quote from Quotable API');
  }
}

/**
 * Fetch a random quote from the ZenQuotes API (fallback)
 * API: https://zenquotes.io/api/random
 */
export async function fetchRandomQuoteFromZenQuotes(): Promise<QuoteData> {
  try {
    const response = await axios.get('https://zenquotes.io/api/random', {
      timeout: 10000,
    });

    const quoteData = response.data[0];
    if (!quoteData) {
      throw new Error('No quote data returned');
    }

    return {
      text: quoteData.q,
      author: quoteData.a.replace(', type.author', '').trim(),
    };
  } catch (error) {
    console.error('[ZenQuotes API] Error fetching quote:', error);
    throw new Error('Failed to fetch quote from ZenQuotes API');
  }
}

/**
 * Fetch a random quote, trying Quotable first, then ZenQuotes as fallback
 */
export async function fetchRandomQuote(): Promise<QuoteData> {
  try {
    return await fetchRandomQuoteFromQuotable();
  } catch (error) {
    console.warn('[Quotes] Quotable API failed, trying ZenQuotes...');
    return await fetchRandomQuoteFromZenQuotes();
  }
}
