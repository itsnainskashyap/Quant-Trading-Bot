import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Loader2, Send, Mail, Building2, ArrowLeft, CheckCircle, Headphones } from "lucide-react";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773167302165.png";

const DEPARTMENTS = [
  { value: "payment", label: "Payment & Billing" },
  { value: "kyc", label: "KYC & Verification" },
  { value: "trade", label: "Trading & Signals" },
  { value: "wallet", label: "Wallet & Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "account", label: "Account & Security" },
  { value: "technical", label: "Technical Issues" },
  { value: "general", label: "General Inquiry" },
];

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [department, setDepartment] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!department) {
      toast({ title: "Error", description: "Please select a department", variant: "destructive" });
      return;
    }

    if (!subject.trim()) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }

    if (!description.trim()) {
      toast({ title: "Error", description: "Please describe your issue", variant: "destructive" });
      return;
    }

    if (!user && !email) {
      toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          department: DEPARTMENTS.find(d => d.value === department)?.label || department,
          subject,
          description,
          email: user?.email || email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit");
      }

      setSubmitted(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-light text-white mb-3">Request Submitted</h1>
          <p className="text-neutral-500 text-sm mb-6">
            Your support request has been sent to our team. We'll respond within 24 hours. A confirmation email has been sent to your inbox.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => { setSubmitted(false); setDepartment(""); setSubject(""); setDescription(""); }}
              variant="outline"
              className="border-white/[0.08] text-neutral-400 hover:text-white"
              data-testid="button-new-request"
            >
              New Request
            </Button>
            <Link href={user ? "/dashboard" : "/"}>
              <Button className="bg-white text-black hover:bg-neutral-200" data-testid="button-go-home">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link href={user ? "/dashboard" : "/"}>
            <button className="text-neutral-500 text-xs hover:text-white transition flex items-center gap-1" data-testid="link-back">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src={logoImage} alt="TradeX AI" className="h-8 w-8 rounded-full" />
            <span className="text-white font-semibold text-lg tracking-tight">TradeX AI</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-light text-white tracking-tight mb-2">Support Center</h1>
          <p className="text-neutral-500 text-sm">How can we help you? Select a department and describe your issue.</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-4">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-400">support@tradexai.in</span>
          </div>
          <div className="flex items-center gap-3 text-sm mt-2">
            <Building2 className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-400">Office 1205, Jumeirah Bay X2 Tower, Cluster X, JLT, Dubai, UAE</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400 font-medium">Your Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg placeholder:text-neutral-600"
                data-testid="input-support-email"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400 font-medium">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg" data-testid="select-department">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-950 border-white/[0.08]">
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d.value} value={d.value} className="text-white hover:bg-white/[0.05]">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400 font-medium">Subject</Label>
            <Input
              placeholder="Brief summary of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg placeholder:text-neutral-600"
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400 font-medium">Description</Label>
            <Textarea
              placeholder="Describe your issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="bg-white/[0.04] border-white/[0.08] text-white rounded-lg placeholder:text-neutral-600 resize-none"
              data-testid="input-description"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !department || !subject.trim() || !description.trim()}
            className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm disabled:opacity-40"
            data-testid="button-submit-support"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-neutral-600 text-xs mt-6">
          Our team typically responds within 24 hours.
        </p>
      </div>
    </div>
  );
}
