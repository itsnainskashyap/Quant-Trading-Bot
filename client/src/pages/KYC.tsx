import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  ArrowLeft,
  Upload,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  Camera,
  User,
  Calendar,
  Hash,
  CreditCard,
  ScanLine,
  Fingerprint,
  BadgeCheck,
} from "lucide-react";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773170426667.png";

const DOC_TYPES = [
  {
    value: "aadhaar",
    label: "Aadhaar Card",
    desc: "12-digit unique identity number issued by UIDAI",
    icon: CreditCard,
  },
  {
    value: "pancard",
    label: "PAN Card",
    desc: "Permanent Account Number issued by Income Tax Dept",
    icon: FileText,
  },
  {
    value: "voter_id",
    label: "Voter ID",
    desc: "Election Photo Identity Card (EPIC)",
    icon: User,
  },
  {
    value: "id_card",
    label: "Government ID",
    desc: "Any valid government-issued photo identification",
    icon: Shield,
  },
];

interface KycStatus {
  status: "not_submitted" | "pending" | "verified" | "rejected";
  documents: Array<{
    id: string;
    documentType: string;
    extractedName: string | null;
    extractedDob: string | null;
    extractedDocNumber: string | null;
    extractedGender: string | null;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    verifiedAt: string | null;
  }>;
  verifiedDocument: {
    documentType: string;
    extractedName: string | null;
    extractedDob: string | null;
    extractedDocNumber: string | null;
    extractedGender: string | null;
    verifiedAt: string | null;
  } | null;
}

export default function KYC() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [backImagePreview, setBackImagePreview] = useState<string>("");
  const [backImageBase64, setBackImageBase64] = useState<string>("");
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verifyStep, setVerifyStep] = useState<"uploading" | "analyzing" | "verifying" | "done" | "error">("uploading");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const { data: kycStatus, isLoading } = useQuery<KycStatus>({
    queryKey: ["/api/kyc/status"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { documentType: string; documentImage: string; documentImageBack?: string }) => {
      setShowVerifyPopup(true);
      setVerifyStep("uploading");
      setVerifyResult(null);

      await new Promise(r => setTimeout(r, 1200));
      setVerifyStep("analyzing");

      const res = await apiRequest("POST", "/api/kyc/submit", data);
      const result = await res.json();

      await new Promise(r => setTimeout(r, 800));
      setVerifyStep("verifying");
      await new Promise(r => setTimeout(r, 1000));

      return result;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      setVerifyStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/status"] });
      setSelectedDocType("");
      setImagePreview("");
      setImageBase64("");
      setBackImagePreview("");
      setBackImageBase64("");
    },
    onError: (error: any) => {
      setVerifyStep("error");
      const msg = error.message || "Failed to submit document";
      const friendlyMsg = msg.includes("entity too large") || msg.includes("413")
        ? "Image file is too large. Please use a smaller or lower resolution image."
        : msg;
      setVerifyResult({ message: friendlyMsg });
    },
  });

  const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = (h * maxWidth) / w;
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (side: "front" | "back") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 15MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const compressed = await compressImage(file);
      if (side === "front") {
        setImagePreview(compressed);
        setImageBase64(compressed);
      } else {
        setBackImagePreview(compressed);
        setBackImageBase64(compressed);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (side === "front") {
          setImagePreview(base64);
          setImageBase64(base64);
        } else {
          setBackImagePreview(base64);
          setBackImageBase64(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedDocType || !imageBase64) {
      toast({
        title: "Missing information",
        description: "Please select a document type and upload front side image",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate({
      documentType: selectedDocType,
      documentImage: imageBase64,
      ...(backImageBase64 ? { documentImageBack: backImageBase64 } : {}),
    });
  };

  const status = kycStatus?.status || "not_submitted";
  const isVerified = status === "verified";
  const isPending = status === "pending";

  return (
    <div className="min-h-screen bg-black text-white" data-testid="page-kyc">
      <div className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/wallet">
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-white/[0.06]" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="TradeX AI" className="w-8 h-8 rounded-full" />
              <span className="text-white font-semibold text-base tracking-tight">TradeX AI</span>
              <h1 className="text-lg font-light">KYC Verification</h1>
            </div>
          </div>
          <Badge
            className={
              isVerified
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : isPending
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : status === "rejected"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
            }
            data-testid="badge-kyc-status"
          >
            {isVerified ? "Verified" : isPending ? "Pending Review" : status === "rejected" ? "Rejected" : "Not Verified"}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
          </div>
        ) : isVerified && kycStatus?.verifiedDocument ? (
          <div className="space-y-6">
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-light text-white">Identity Verified</h2>
                    <p className="text-sm text-neutral-400">Your KYC verification is complete. You can now make deposits.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {kycStatus.verifiedDocument.extractedName && (
                    <div className="flex items-center gap-3" data-testid="text-kyc-name">
                      <User className="w-4 h-4 text-neutral-500" />
                      <div>
                        <p className="text-xs text-neutral-500">Full Name</p>
                        <p className="text-white">{kycStatus.verifiedDocument.extractedName}</p>
                      </div>
                    </div>
                  )}
                  {kycStatus.verifiedDocument.extractedDob && (
                    <div className="flex items-center gap-3" data-testid="text-kyc-dob">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <div>
                        <p className="text-xs text-neutral-500">Date of Birth</p>
                        <p className="text-white">{kycStatus.verifiedDocument.extractedDob}</p>
                      </div>
                    </div>
                  )}
                  {kycStatus.verifiedDocument.extractedDocNumber && (
                    <div className="flex items-center gap-3" data-testid="text-kyc-docnum">
                      <Hash className="w-4 h-4 text-neutral-500" />
                      <div>
                        <p className="text-xs text-neutral-500">Document Number</p>
                        <p className="text-white font-mono">{kycStatus.verifiedDocument.extractedDocNumber}</p>
                      </div>
                    </div>
                  )}
                  {kycStatus.verifiedDocument.extractedGender && (
                    <div className="flex items-center gap-3" data-testid="text-kyc-gender">
                      <User className="w-4 h-4 text-neutral-500" />
                      <div>
                        <p className="text-xs text-neutral-500">Gender</p>
                        <p className="text-white">{kycStatus.verifiedDocument.extractedGender}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-neutral-500" />
                    <div>
                      <p className="text-xs text-neutral-500">Document Type</p>
                      <p className="text-white capitalize">{kycStatus.verifiedDocument.documentType.replace("_", " ")}</p>
                    </div>
                  </div>
                  {kycStatus.verifiedDocument.verifiedAt && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-neutral-500" />
                      <div>
                        <p className="text-xs text-neutral-500">Verified On</p>
                        <p className="text-white">{new Date(kycStatus.verifiedDocument.verifiedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Link href="/wallet">
                <Button className="bg-white text-black hover:bg-neutral-200 px-8" data-testid="button-go-deposit">
                  Go to Wallet & Deposit
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {isPending && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-6 flex items-center gap-4">
                  <Clock className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-amber-400">Verification In Progress</h3>
                    <p className="text-sm text-neutral-400 mt-1">Your document is being reviewed. This usually takes a few minutes.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {status === "rejected" && kycStatus?.documents && (
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-6 flex items-start gap-4">
                  <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-400">Verification Rejected</h3>
                    <p className="text-sm text-neutral-400 mt-1">Your previous submission was rejected. Please submit a clear image of your document.</p>
                    {kycStatus.documents
                      .filter((d) => d.status === "rejected" && d.adminNotes)
                      .map((d) => (
                        <p key={d.id} className="text-sm text-red-300 mt-2">
                          Reason: {d.adminNotes}
                        </p>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <>
                <div>
                  <h2 className="text-xl font-light mb-2">Verify Your Identity</h2>
                  <p className="text-sm text-neutral-400">
                    KYC verification is required before you can make deposits. Upload both sides of your government-issued ID document and our team will verify your details.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-300 mb-4">Select Document Type</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DOC_TYPES.map((doc) => {
                      const Icon = doc.icon;
                      const isSelected = selectedDocType === doc.value;
                      return (
                        <button
                          key={doc.value}
                          onClick={() => setSelectedDocType(doc.value)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-white/30 bg-white/[0.06]"
                              : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                          }`}
                          data-testid={`button-doc-${doc.value}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-white/10" : "bg-white/[0.04]"}`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-neutral-500"}`} />
                            </div>
                            <div>
                              <p className={`font-medium text-sm ${isSelected ? "text-white" : "text-neutral-300"}`}>{doc.label}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">{doc.desc}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDocType && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 mb-4">Upload Document (Front & Back)</h3>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect("front")}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-document-file-front"
                    />
                    <input
                      type="file"
                      ref={backFileInputRef}
                      onChange={handleFileSelect("back")}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-document-file-back"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-neutral-400 mb-2 font-medium">Front Side *</p>
                        {imagePreview ? (
                          <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
                            <img src={imagePreview} alt="Front side preview" className="w-full h-48 object-contain p-3" data-testid="img-document-preview-front" />
                            <button
                              onClick={() => {
                                setImagePreview("");
                                setImageBase64("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white transition"
                              data-testid="button-remove-front"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-48 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-white/[0.16] bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3"
                            data-testid="button-upload-front"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                              <Camera className="w-6 h-6 text-neutral-500" />
                            </div>
                            <div className="text-center">
                              <p className="text-neutral-300 text-sm font-medium">Upload Front Side</p>
                              <p className="text-xs text-neutral-500 mt-1">Max 10MB</p>
                            </div>
                          </button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-neutral-400 mb-2 font-medium">Back Side (optional)</p>
                        {backImagePreview ? (
                          <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
                            <img src={backImagePreview} alt="Back side preview" className="w-full h-48 object-contain p-3" data-testid="img-document-preview-back" />
                            <button
                              onClick={() => {
                                setBackImagePreview("");
                                setBackImageBase64("");
                                if (backFileInputRef.current) backFileInputRef.current.value = "";
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white transition"
                              data-testid="button-remove-back"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => backFileInputRef.current?.click()}
                            className="w-full h-48 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-white/[0.16] bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3"
                            data-testid="button-upload-back"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                              <Camera className="w-6 h-6 text-neutral-500" />
                            </div>
                            <div className="text-center">
                              <p className="text-neutral-300 text-sm font-medium">Upload Back Side</p>
                              <p className="text-xs text-neutral-500 mt-1">Max 10MB</p>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>

                    {imagePreview && (
                      <div className="space-y-4 mt-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <AlertCircle className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-neutral-400 space-y-1">
                            <p>Make sure both sides of the document are clear, well-lit, and all text is readable.</p>
                            <p>Our team will review your submission and verify your identity.</p>
                          </div>
                        </div>

                        <Button
                          onClick={handleSubmit}
                          disabled={submitMutation.isPending}
                          className="w-full bg-white text-black hover:bg-neutral-200 h-12 text-base font-medium"
                          data-testid="button-submit-kyc"
                        >
                          {submitMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Submitting your document...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Shield className="w-5 h-5" />
                              Submit for Verification
                            </span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {submitMutation.data && (
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Clock className="w-6 h-6 text-blue-400 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-white">Submitted for Review</h3>
                          <p className="text-sm text-neutral-400 mt-1">{submitMutation.data.message}</p>
                          {submitMutation.data.extractedName && (
                            <div className="mt-4 space-y-2">
                              <p className="text-xs text-neutral-500">Extracted Details:</p>
                              <div className="flex flex-wrap gap-3">
                                {submitMutation.data.extractedName && (
                                  <Badge variant="outline" className="border-white/10 text-neutral-300">
                                    <User className="w-3 h-3 mr-1" />
                                    {submitMutation.data.extractedName}
                                  </Badge>
                                )}
                                {submitMutation.data.extractedDob && (
                                  <Badge variant="outline" className="border-white/10 text-neutral-300">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {submitMutation.data.extractedDob}
                                  </Badge>
                                )}
                                {submitMutation.data.extractedDocNumber && (
                                  <Badge variant="outline" className="border-white/10 text-neutral-300">
                                    <Hash className="w-3 h-3 mr-1" />
                                    {submitMutation.data.extractedDocNumber}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {kycStatus?.documents && kycStatus.documents.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-300 mb-4">Submission History</h3>
                <div className="space-y-3">
                  {kycStatus.documents.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between" data-testid={`card-kyc-doc-${doc.id}`}>
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="text-sm text-white capitalize">{doc.documentType.replace("_", " ")}</p>
                          <p className="text-xs text-neutral-500">{doc.extractedName || "Processing..."}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-600">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        <Badge
                          className={
                            doc.status === "verified"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : doc.status === "rejected"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }
                        >
                          {doc.status === "verified" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : doc.status === "rejected" ? <XCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showVerifyPopup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" data-testid="modal-kyc-verify">
          <div className="bg-neutral-950 border border-white/[0.08] rounded-2xl w-full max-w-sm p-8">
            <div className="text-center space-y-6">
              {verifyStep === "uploading" && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Uploading Document</h3>
                    <p className="text-sm text-neutral-500">Securely uploading your document...</p>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "40%" }} />
                  </div>
                </>
              )}

              {verifyStep === "analyzing" && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                    <ScanLine className="w-8 h-8 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">AI Analysis in Progress</h3>
                    <p className="text-sm text-neutral-500">Extracting data and verifying document authenticity...</p>
                  </div>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Document uploaded
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> Scanning document details...
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-600">
                      <Fingerprint className="w-3 h-3" /> Identity verification pending
                    </div>
                  </div>
                </>
              )}

              {verifyStep === "verifying" && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Fingerprint className="w-8 h-8 text-purple-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Verifying Identity</h3>
                    <p className="text-sm text-neutral-500">Running final verification checks...</p>
                  </div>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Document uploaded
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Data extracted successfully
                    </div>
                    <div className="flex items-center gap-2 text-xs text-purple-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying identity...
                    </div>
                  </div>
                </>
              )}

              {verifyStep === "done" && verifyResult && (
                <>
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${verifyResult.autoVerified ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                    {verifyResult.autoVerified ? (
                      <BadgeCheck className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <Clock className="w-8 h-8 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">
                      {verifyResult.autoVerified ? "KYC Verified!" : "Submitted for Review"}
                    </h3>
                    <p className="text-sm text-neutral-500">{verifyResult.message}</p>
                  </div>
                  {verifyResult.autoVerified && verifyResult.confidence && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">AI Confidence</span>
                        <span className="text-emerald-400 font-mono">{verifyResult.confidence}%</span>
                      </div>
                      {verifyResult.extractedName && (
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Name</span>
                          <span className="text-white">{verifyResult.extractedName}</span>
                        </div>
                      )}
                      {verifyResult.extractedDocNumber && (
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Doc Number</span>
                          <span className="text-white font-mono">{verifyResult.extractedDocNumber}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Document uploaded
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Data extracted
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${verifyResult.autoVerified ? "text-emerald-400" : "text-amber-400"}`}>
                      {verifyResult.autoVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {verifyResult.autoVerified ? "Identity verified" : "Pending admin review"}
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowVerifyPopup(false)}
                    className="w-full bg-white text-black hover:bg-neutral-200"
                    data-testid="button-close-verify-popup"
                  >
                    {verifyResult.autoVerified ? "Continue" : "Close"}
                  </Button>
                </>
              )}

              {verifyStep === "error" && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Verification Failed</h3>
                    <p className="text-sm text-red-400">{verifyResult?.message || "Something went wrong"}</p>
                  </div>
                  <Button
                    onClick={() => setShowVerifyPopup(false)}
                    className="w-full bg-white text-black hover:bg-neutral-200"
                    data-testid="button-close-error-popup"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
