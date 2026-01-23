import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const userId = userData.id as string;
    const userEmail = userData.email as string;
    
    // First check if user exists by email (to handle ID changes)
    if (userEmail) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, userEmail));
      if (existingByEmail.length > 0) {
        // Update existing user with new data
        const [user] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userEmail))
          .returning();
        return user;
      }
    }
    
    // Check if user exists by ID
    if (userId) {
      const existingById = await db.select().from(users).where(eq(users.id, userId));
      if (existingById.length > 0) {
        const [user] = await db
          .update(users)
          .set({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
        return user;
      }
    }
    
    // Insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
