export interface IndustryPack {
  id: string;
  name: string;
  icon: string;
  greeting: string;
  avgJobValue: number;
  appointmentTypes: { name: string; duration: number }[];
  knowledgeBase: {
    commonQuestions: { q: string; a: string }[];
    services: string[];
  };
  inboundWorkflows: {
    name: string;
    trigger: "missed_call" | "appointment_booked" | "no_show" | "quote_sent" | "days_inactive";
    triggerConfig?: Record<string, unknown>;
    steps: {
      channel: "sms" | "call" | "email";
      delay: number;
      condition?: "if_no_reply";
      template?: string;
      script?: string;
    }[];
  }[];
  outboundCampaigns: {
    name: string;
    type: "reactivation" | "no_show_recovery" | "quote_chase" | "review_request" | "appointment_reminder";
    description: string;
    targetFilter: {
      days_not_contacted?: number;
      statuses?: string[];
      min_score?: number;
    };
    sequence: {
      channel: "sms" | "call" | "email";
      delay: number;
      template: string;
    }[];
  }[];
}
