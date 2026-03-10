import type { Express, Request, Response, RequestHandler } from "express";
import { db } from "./db";
import { kycDocuments } from "@shared/models/trading";
import { users } from "@shared/models/auth";
import { eq, desc, and, ne } from "drizzle-orm";
import OpenAI from "openai";
import { sendKycStatusEmail } from "./emailService";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getUserIdFromRequest(req: any): string | null {
  if (req.session?.userId) return req.session.userId;
  if (req.user?.claims?.sub) return req.user.claims.sub;
  return null;
}

async function extractDocumentDetails(base64Image: string, documentType: string) {
  const docTypeLabels: Record<string, string> = {
    aadhaar: "Aadhaar Card (Indian national ID)",
    pancard: "PAN Card (Indian tax ID)",
    voter_id: "Voter ID Card (Indian election ID)",
    id_card: "Government-issued ID Card",
  };

  const docLabel = docTypeLabels[documentType] || "Government ID";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a document verification AI. Extract details from the uploaded ${docLabel}. Return a JSON object with these fields:
- name: Full name as printed on the document
- dob: Date of birth in DD/MM/YYYY format (if visible)
- docNumber: The document number (Aadhaar number, PAN number, Voter ID number, etc.)
- fatherName: Father's name (if visible)
- address: Full address (if visible)
- gender: Gender (if visible)
- isValid: boolean - whether this appears to be a genuine ${docLabel}
- confidence: number 0-100 - how confident you are this is a real document

IMPORTANT: Only extract what is clearly visible. Use null for fields that are not visible or unclear. Be strict about validation - check if the document format matches expected ${docLabel} format.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please extract all details from this ${docLabel} and verify its authenticity.`,
          },
          {
            type: "image_url",
            image_url: {
              url: base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI failed to process the document");

  return JSON.parse(content);
}

export function setupKycRoutes(app: Express, verifyAdminSession?: (sessionId: string) => boolean): void {
  const requireAdmin = (req: Request, res: Response): boolean => {
    const sessionId = req.headers["x-admin-session"] as string;
    if (!sessionId || !verifyAdminSession || !verifyAdminSession(sessionId)) {
      res.status(401).json({ message: "Admin authentication required" });
      return false;
    }
    return true;
  };

  app.get("/api/kyc/status", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const docs = await db
        .select()
        .from(kycDocuments)
        .where(eq(kycDocuments.userId, userId))
        .orderBy(desc(kycDocuments.createdAt));

      const verified = docs.find((d) => d.status === "verified");
      const pending = docs.find((d) => d.status === "pending");
      const rejected = docs.filter((d) => d.status === "rejected");

      let kycStatus: "not_submitted" | "pending" | "verified" | "rejected" = "not_submitted";
      if (verified) kycStatus = "verified";
      else if (pending) kycStatus = "pending";
      else if (rejected.length > 0 && !pending) kycStatus = "rejected";

      res.json({
        status: kycStatus,
        documents: docs.map((d) => ({
          id: d.id,
          documentType: d.documentType,
          extractedName: d.extractedName,
          extractedDob: d.extractedDob,
          extractedDocNumber: d.extractedDocNumber,
          extractedGender: d.extractedGender,
          status: d.status,
          adminNotes: d.adminNotes,
          createdAt: d.createdAt,
          verifiedAt: d.verifiedAt,
        })),
        verifiedDocument: verified
          ? {
              documentType: verified.documentType,
              extractedName: verified.extractedName,
              extractedDob: verified.extractedDob,
              extractedDocNumber: verified.extractedDocNumber,
              extractedGender: verified.extractedGender,
              verifiedAt: verified.verifiedAt,
            }
          : null,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/kyc/submit", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { documentType, documentImage, documentImageBack } = req.body;

      if (!documentType || !["aadhaar", "pancard", "voter_id", "id_card"].includes(documentType)) {
        return res.status(400).json({ message: "Valid document type is required" });
      }

      if (!documentImage || typeof documentImage !== "string") {
        return res.status(400).json({ message: "Front side document image is required" });
      }

      if (!documentImage.startsWith("data:image/")) {
        return res.status(400).json({ message: "Invalid image format for front side. Please upload a valid image file." });
      }

      const base64Part = documentImage.split(",")[1] || "";
      const imageSizeBytes = Math.ceil(base64Part.length * 0.75);
      if (imageSizeBytes > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "Front image is too large. Maximum size is 10MB." });
      }

      if (documentImageBack) {
        if (typeof documentImageBack !== "string" || !documentImageBack.startsWith("data:image/")) {
          return res.status(400).json({ message: "Invalid image format for back side." });
        }
        const backBase64Part = documentImageBack.split(",")[1] || "";
        const backSizeBytes = Math.ceil(backBase64Part.length * 0.75);
        if (backSizeBytes > 10 * 1024 * 1024) {
          return res.status(400).json({ message: "Back image is too large. Maximum size is 10MB." });
        }
      }

      const existingVerified = await db
        .select()
        .from(kycDocuments)
        .where(eq(kycDocuments.userId, userId));
      if (existingVerified.some((d) => d.status === "verified")) {
        return res.status(400).json({ message: "KYC already verified" });
      }
      if (existingVerified.some((d) => d.status === "pending")) {
        return res.status(400).json({ message: "You already have a pending KYC submission" });
      }

      let extracted: any = {};
      try {
        extracted = await extractDocumentDetails(documentImage, documentType);
      } catch (aiError: any) {
        console.error("AI extraction error:", aiError.message);
        extracted = { name: null, dob: null, docNumber: null, isValid: false, confidence: 0 };
      }

      if (extracted.docNumber) {
        const normalizedDocNumber = extracted.docNumber.replace(/[\s\-]/g, "").toUpperCase();
        const allDocsWithNumber = await db
          .select()
          .from(kycDocuments)
          .where(ne(kycDocuments.userId, userId));
        const alreadyUsed = allDocsWithNumber.some((d) => {
          if (!d.extractedDocNumber) return false;
          const normalizedExisting = d.extractedDocNumber.replace(/[\s\-]/g, "").toUpperCase();
          return normalizedExisting === normalizedDocNumber;
        });
        if (alreadyUsed) {
          return res.status(400).json({
            message: "This document has already been used for verification by another account. Each document can only be linked to one account.",
          });
        }
      }

      const autoVerify = extracted.isValid === true && extracted.confidence >= 85 && extracted.docNumber && extracted.name;
      const docStatus = autoVerify ? "verified" : "pending";

      const [doc] = await db
        .insert(kycDocuments)
        .values({
          userId,
          documentType,
          documentImage,
          documentImageBack: documentImageBack || null,
          extractedName: extracted.name || null,
          extractedDob: extracted.dob || null,
          extractedDocNumber: extracted.docNumber || null,
          extractedFatherName: extracted.fatherName || null,
          extractedAddress: extracted.address || null,
          extractedGender: extracted.gender || null,
          status: docStatus,
          verifiedAt: autoVerify ? new Date() : null,
          adminNotes: autoVerify ? "Auto-verified by AI (confidence: " + extracted.confidence + "%)" : null,
        })
        .returning();

      if (autoVerify && extracted.name) {
        const nameParts = extracted.name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || null;
        const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
        if (existingUser && !existingUser.firstName) {
          await db.update(users).set({ firstName, lastName, updatedAt: new Date() }).where(eq(users.id, userId));
        }
        if (existingUser?.email) {
          sendKycStatusEmail(existingUser.email, "verified");
        }
      }

      res.json({
        id: doc.id,
        status: docStatus,
        autoVerified: autoVerify,
        confidence: extracted.confidence || 0,
        extractedName: doc.extractedName,
        extractedDob: doc.extractedDob,
        extractedDocNumber: doc.extractedDocNumber,
        extractedGender: doc.extractedGender,
        message: autoVerify
          ? "Document verified successfully! Your KYC is now approved."
          : "Document submitted successfully. Our team will review and verify it shortly.",
      });
    } catch (e: any) {
      console.error("KYC submit error:", e.message);
      res.status(500).json({ message: "Failed to process document. Please try again." });
    }
  }) as RequestHandler);

  app.get("/api/admin/kyc", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;

      const allDocs = await db
        .select({
          kyc: kycDocuments,
          userEmail: users.email,
          userFirstName: users.firstName,
        })
        .from(kycDocuments)
        .leftJoin(users, eq(kycDocuments.userId, users.id))
        .orderBy(desc(kycDocuments.createdAt));

      res.json(
        allDocs.map((d) => ({
          ...d.kyc,
          userEmail: d.userEmail,
          userName: d.userFirstName,
        }))
      );
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/admin/kyc/:id/action", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const { id } = req.params;
      const { action, notes } = req.body;

      if (!["verified", "rejected"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const [doc] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
      if (!doc) return res.status(404).json({ message: "KYC document not found" });

      await db
        .update(kycDocuments)
        .set({
          status: action,
          adminNotes: notes || null,
          verifiedAt: action === "verified" ? new Date() : null,
        })
        .where(eq(kycDocuments.id, id));

      if (action === "verified" && doc.extractedName) {
        const nameParts = doc.extractedName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || null;
        const [existingUser] = await db.select().from(users).where(eq(users.id, doc.userId));
        if (existingUser && !existingUser.firstName) {
          await db.update(users).set({
            firstName,
            lastName,
            updatedAt: new Date(),
          }).where(eq(users.id, doc.userId));
        }
      }

      const [kycUser] = await db.select().from(users).where(eq(users.id, doc.userId));
      if (kycUser?.email) {
        sendKycStatusEmail(kycUser.email, action as "verified" | "rejected", notes);
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);
}
