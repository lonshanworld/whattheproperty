import { Pool, type QueryResultRow } from "pg";

import seedListings from "@/data/listings.json";
import type { Listing, ListingFilters } from "@/lib/types";

// Reads the database connection string from the environment.
function getConnectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return value;
}

let pool: Pool | undefined;
let initPromise: Promise<void> | undefined;

// Lazily creates and reuses the Postgres connection pool.
function getPool() {
  if (!pool) {
    const connectionString = getConnectionString();
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }

  return pool;
}

// Converts a Postgres row into the app's listing shape.
function mapRow(row: QueryResultRow): Listing {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    area: row.area,
    price: Number(row.price),
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    size_sqm: Number(row.size_sqm),
    type: row.type,
    near_transit: row.near_transit,
    furnished: Boolean(row.furnished),
    image: row.image,
    description: row.description,
  };
}

// Creates the listings table and seeds it with the sample data once.
export async function initializeDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getPool();

      await db.query(`
        CREATE TABLE IF NOT EXISTS listings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          city TEXT NOT NULL,
          area TEXT NOT NULL,
          price INTEGER NOT NULL,
          bedrooms INTEGER NOT NULL,
          bathrooms INTEGER NOT NULL,
          size_sqm INTEGER NOT NULL,
          type TEXT NOT NULL,
          near_transit TEXT NOT NULL,
          furnished BOOLEAN NOT NULL,
          image TEXT NOT NULL,
          description TEXT NOT NULL
        )
      `);

      for (const listing of seedListings) {
        await db.query(
          `
            INSERT INTO listings (
              id, title, city, area, price, bedrooms, bathrooms, size_sqm,
              type, near_transit, furnished, image, description
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              city = EXCLUDED.city,
              area = EXCLUDED.area,
              price = EXCLUDED.price,
              bedrooms = EXCLUDED.bedrooms,
              bathrooms = EXCLUDED.bathrooms,
              size_sqm = EXCLUDED.size_sqm,
              type = EXCLUDED.type,
              near_transit = EXCLUDED.near_transit,
              furnished = EXCLUDED.furnished,
              image = EXCLUDED.image,
              description = EXCLUDED.description
          `,
          [
            listing.id,
            listing.title,
            listing.city,
            listing.area,
            listing.price,
            listing.bedrooms,
            listing.bathrooms,
            listing.size_sqm,
            listing.type,
            listing.near_transit,
            listing.furnished,
            listing.image,
            listing.description,
          ],
        );
      }
    })();
  }

  return initPromise;
}

// Fetches listings from Postgres and applies optional filters.
export async function getListings(filters: ListingFilters = {}) {
  await initializeDatabase();

  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters.city) {
    values.push(filters.city);
    conditions.push(`LOWER(city) = LOWER($${values.length})`);
  }

  if (typeof filters.maxPrice === "number" && !Number.isNaN(filters.maxPrice)) {
    values.push(filters.maxPrice);
    conditions.push(`price <= $${values.length}`);
  }

  if (typeof filters.bedrooms === "number" && !Number.isNaN(filters.bedrooms)) {
    values.push(filters.bedrooms);
    conditions.push(`bedrooms = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await getPool().query(
    `SELECT * FROM listings ${whereClause} ORDER BY price ASC, id ASC`,
    values,
  );

  return result.rows.map(mapRow);
}
