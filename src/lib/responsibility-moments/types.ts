export type ResponsibilitySubjectType = "commitment" | "opportunity" | "payment" | "shared_transaction";
export type AuthorityHolder = "environment" | "business" | "shared";
export type DeterminedFrom = "intervention" | "timeout" | "acknowledgement" | "manual_override" | "dispute";

export interface RecordResponsibilityMomentInput {
  workspaceId: string;
  subjectType: ResponsibilitySubjectType;
  subjectId: string;
  authorityHolder: AuthorityHolder;
  determinedFrom: DeterminedFrom;
}
