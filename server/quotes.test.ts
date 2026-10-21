import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRandomQuote, fetchRandomQuoteFromQuotable, fetchRandomQuoteFromZenQuotes } from './quotes';
import axios from 'axios';

vi.mock('axios');

describe('Quote Fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchRandomQuoteFromQuotable', () => {
    it('should fetch a quote from Quotable API', async () => {
      const mockResponse = {
        data: {
          content: 'The only way to do great work is to love what you do.',
          author: 'Steve Jobs, entrepreneur',
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await fetchRandomQuoteFromQuotable();

      expect(result).toEqual({
        text: 'The only way to do great work is to love what you do.',
        author: 'Steve Jobs',
      });
      expect(axios.get).toHaveBeenCalledWith('https://api.quotable.io/random', {
        timeout: 10000,
      });
    });

    it('should throw error when API fails', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchRandomQuoteFromQuotable()).rejects.toThrow(
        'Failed to fetch quote from Quotable API'
      );
    });
  });

  describe('fetchRandomQuoteFromZenQuotes', () => {
    it('should fetch a quote from ZenQuotes API', async () => {
      const mockResponse = {
        data: [
          {
            q: 'The best time to plant a tree was 20 years ago. The second best time is now.',
            a: 'Chinese Proverb, type.author',
          },
        ],
      };

      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await fetchRandomQuoteFromZenQuotes();

      expect(result).toEqual({
        text: 'The best time to plant a tree was 20 years ago. The second best time is now.',
        author: 'Chinese Proverb',
      });
      expect(axios.get).toHaveBeenCalledWith('https://zenquotes.io/api/random', {
        timeout: 10000,
      });
    });

    it('should throw error when API fails', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchRandomQuoteFromZenQuotes()).rejects.toThrow(
        'Failed to fetch quote from ZenQuotes API'
      );
    });
  });

  describe('fetchRandomQuote', () => {
    it('should fetch from Quotable first', async () => {
      const mockResponse = {
        data: {
          content: 'Test quote',
          author: 'Test Author',
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await fetchRandomQuote();

      expect(result).toEqual({
        text: 'Test quote',
        author: 'Test Author',
      });
      expect(axios.get).toHaveBeenCalledWith('https://api.quotable.io/random', {
        timeout: 10000,
      });
    });

    it('should fallback to ZenQuotes if Quotable fails', async () => {
      const zenResponse = {
        data: [
          {
            q: 'Fallback quote',
            a: 'Fallback Author',
          },
        ],
      };

      vi.mocked(axios.get)
        .mockRejectedValueOnce(new Error('Quotable failed'))
        .mockResolvedValueOnce(zenResponse);

      const result = await fetchRandomQuote();

      expect(result).toEqual({
        text: 'Fallback quote',
        author: 'Fallback Author',
      });
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });
});
