import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { fetchRandomQuote } from "./quotes";
import { createQuote, getAllQuotes, searchQuotes, toggleFavorite, clearAllQuotes, getFavoriteQuotes } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  quotes: router({
    getRandomQuote: publicProcedure.mutation(async () => {
      try {
        const quoteData = await fetchRandomQuote();
        const quote = await createQuote({
          quote: quoteData.text,
          author: quoteData.author,
          favorite: false,
        });
        return {
          success: true,
          quote,
        };
      } catch (error) {
        console.error('[Router] Error fetching quote:', error);
        return {
          success: false,
          error: 'Failed to fetch quote. Please try again.',
        };
      }
    }),

    getHistory: publicProcedure.query(async () => {
      try {
        const quotes = await getAllQuotes();
        return {
          success: true,
          quotes,
        };
      } catch (error) {
        console.error('[Router] Error getting history:', error);
        return {
          success: false,
          quotes: [],
        };
      }
    }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        try {
          const results = await searchQuotes(input.query);
          return {
            success: true,
            quotes: results,
          };
        } catch (error) {
          console.error('[Router] Error searching quotes:', error);
          return {
            success: false,
            quotes: [],
          };
        }
      }),

    toggleFavorite: publicProcedure
      .input(z.object({ id: z.number(), favorite: z.boolean() }))
      .mutation(async ({ input }) => {
        try {
          const quote = await toggleFavorite(input.id, input.favorite);
          return {
            success: true,
            quote,
          };
        } catch (error) {
          console.error('[Router] Error toggling favorite:', error);
          return {
            success: false,
            error: 'Failed to toggle favorite',
          };
        }
      }),

    clearHistory: publicProcedure.mutation(async () => {
      try {
        await clearAllQuotes();
        return {
          success: true,
        };
      } catch (error) {
        console.error('[Router] Error clearing history:', error);
        return {
          success: false,
          error: 'Failed to clear history',
        };
      }
    }),

    getFavorites: publicProcedure.query(async () => {
      try {
        const quotes = await getFavoriteQuotes();
        return {
          success: true,
          quotes,
        };
      } catch (error) {
        console.error('[Router] Error getting favorites:', error);
        return {
          success: false,
          quotes: [],
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
