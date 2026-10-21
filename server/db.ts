import { eq, desc, like, or, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, quotes, Quote, InsertQuote } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Quote database helpers

export async function createQuote(quoteData: InsertQuote): Promise<Quote | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create quote: database not available");
    return null;
  }

  try {
    const result = await db.insert(quotes).values(quoteData);
    // Fetch the created quote
    const created = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, result[0].insertId as number))
      .limit(1);
    
    return created.length > 0 ? created[0] : null;
  } catch (error: any) {
    // Silently handle duplicate quote entries
    if (error.code === 'ER_DUP_ENTRY') {
      console.log("[Database] Quote already exists, skipping duplicate");
      // Return the existing quote
      const existing = await db
        .select()
        .from(quotes)
        .where(eq(quotes.quote, quoteData.quote))
        .limit(1);
      return existing.length > 0 ? existing[0] : null;
    }
    console.error("[Database] Failed to create quote:", error);
    throw error;
  }
}

export async function getAllQuotes(): Promise<Quote[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get quotes: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(quotes)
      .orderBy(desc(quotes.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get quotes:", error);
    return [];
  }
}

export async function searchQuotes(searchTerm: string): Promise<Quote[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot search quotes: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(quotes)
      .where(
        or(
          like(quotes.quote, `%${searchTerm}%`),
          like(quotes.author, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(quotes.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to search quotes:", error);
    return [];
  }
}

export async function toggleFavorite(quoteId: number, favorite: boolean): Promise<Quote | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot toggle favorite: database not available");
    return null;
  }

  try {
    await db
      .update(quotes)
      .set({ favorite, updatedAt: new Date() })
      .where(eq(quotes.id, quoteId));

    const result = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to toggle favorite:", error);
    throw error;
  }
}

export async function clearAllQuotes(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot clear quotes: database not available");
    return false;
  }

  try {
    await db.delete(quotes);
    return true;
  } catch (error) {
    console.error("[Database] Failed to clear quotes:", error);
    throw error;
  }
}

export async function getFavoriteQuotes(): Promise<Quote[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get favorite quotes: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(quotes)
      .where(eq(quotes.favorite, true))
      .orderBy(desc(quotes.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get favorite quotes:", error);
    return [];
  }
}
