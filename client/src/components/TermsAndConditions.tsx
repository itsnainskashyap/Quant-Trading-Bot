import { Shield, Clock, AlertTriangle, Ban, DollarSign, UserX, Scale, FileText } from "lucide-react";

export function TermsContent({ showThirdParty = true }: { showThirdParty?: boolean }) {
  return (
    <div className="space-y-4 text-sm text-gray-300">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <Shield className="w-5 h-5 text-neutral-400 flex-shrink-0" />
        <h3 className="font-semibold text-white text-base">TradeX AI - Terms & Conditions</h3>
      </div>

      <p className="text-gray-400 text-xs leading-relaxed">
        By creating an account on TradeX AI, you agree to the following terms and conditions. Please read them carefully before proceeding.
      </p>

      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium text-white text-xs">Deposit Processing</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pl-6">
            All deposits are processed within 24 hours of submission. The credited amount will reflect in your wallet after admin verification and approval. Processing times may vary depending on network congestion for crypto deposits.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium text-white text-xs">Withdrawal Processing</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pl-6">
            Withdrawal requests are processed within 24 hours. Withdrawals require admin approval. The platform reserves the right to request additional verification before processing large withdrawals.
          </p>
        </div>

        {showThirdParty && (
          <>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-1.5">
                <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="font-medium text-red-300 text-xs">Third-Party UPI Payments Strictly Prohibited</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pl-6">
                UPI payments must be made only from the account holder's own UPI ID. Third-party UPI payments (payments from someone else's account) are strictly not allowed. Using another person's UPI account to make deposits is a violation of our terms.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-1.5">
                <DollarSign className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="font-medium text-red-300 text-xs">Third-Party Payment Penalty</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pl-6">
                If any third-party payment is detected, the entire deposited amount will be deducted from your account without refund. TradeX AI actively monitors all transactions and reserves the right to take immediate action including account suspension.
              </p>
            </div>
          </>
        )}

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <UserX className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-medium text-white text-xs">Account Responsibility</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pl-6">
            You are solely responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility. Do not share your login details with anyone.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium text-white text-xs">Trading Risk Disclaimer</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pl-6">
            Cryptocurrency trading involves substantial risk of loss. AI-generated signals are for informational purposes and do not guarantee profits. Past performance does not indicate future results. Trade only with funds you can afford to lose.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Scale className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="font-medium text-white text-xs">Platform Rights</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pl-6">
            TradeX AI reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. The platform may suspend or terminate accounts that violate these terms without prior notice.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <span className="font-medium text-white text-xs">UPI Conversion Rate</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pl-6">
            UPI deposits are converted at the rate of 93.5 INR = 1 USDT. This rate is fixed and set by the platform. The platform reserves the right to update this conversion rate at any time.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-medium text-white text-xs">KYC & Verification</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pl-6">
            The platform may request identity verification (KYC) at any time. Failure to complete verification when requested may result in restricted access to deposit and withdrawal features.
          </p>
        </div>
      </div>

      <p className="text-[10px] text-gray-600 text-center pt-2 border-t border-white/5">
        Last updated: March 2026 | TradeX AI Platform
      </p>
    </div>
  );
}
