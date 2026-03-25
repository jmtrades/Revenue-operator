export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Appointment Set"
  | "Won"
  | "Lost";

export type LeadSource = "Inbound Call" | "Outbound Outreach" | "Website" | "Referral";

type StatusT = (key: string) => string;

export function getStatusDisplay(status: LeadStatus, t: StatusT): string {
  const map: Record<LeadStatus, string> = {
    New: t("leads.status.new"),
    Contacted: t("leads.status.contacted"),
    Qualified: t("leads.status.qualified"),
    "Appointment Set": t("leads.status.appointmentSet"),
    Won: t("leads.status.won"),
    Lost: t("leads.status.lost"),
  };
  return map[status] ?? status;
}

export function getSourceDisplay(source: LeadSource, t: StatusT): string {
  const map: Record<LeadSource, string> = {
    "Inbound Call": t("leads.sources.inboundCall"),
    "Outbound Outreach": t("leads.sources.outbound"),
    Website: t("leads.sources.website"),
    Referral: t("leads.sources.referral"),
  };
  return map[source] ?? source;
}

