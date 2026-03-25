export type TelephonyProvider = "twilio" | "telnyx";

export interface AvailableNumber {
  phone_number: string;
  friendly_name: string;
  type: "local" | "toll_free" | "mobile";
  monthly_cost_cents: number;
  setup_fee_cents: number;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export interface PurchasedNumber {
  numberId: string;
  phoneNumber: string;
  status: "active" | "pending" | "failed" | string;
}

export interface SmsParams {
  from: string;
  to: string;
  text: string;
  messagingProfileId?: string;
}

export interface CallParams {
  from: string;
  to: string;
  webhookUrl: string;
  streamUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CallResult {
  callId: string;
  callSessionId?: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
}

export interface SmsResult {
  messageId: string;
  status: "queued" | "sent" | "delivered" | "failed";
}
