export type MediationInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED'
export type MediationStatus =
  | 'AWAITING_RESPONDENT_LAWYER'
  | 'AWAITING_MEDIATOR_SELECTION'
  | 'IN_SESSION'
  | 'RESOLVED'
  | 'ESCALATED_TO_CASE'
  | 'CANCELLED'
export type MediationOutcome = 'RESOLVED' | 'ESCALATED_TO_CASE'

export interface PartyRef {
  id: string
  name: string
  email?: string
  avatarUrl?: string | null
}

export interface MediationInvite {
  id: string
  token: string
  initiatorClientId: string
  initiatorLawyerId?: string | null
  respondentEmail: string
  respondentName?: string | null
  respondentPhone?: string | null
  respondentClientId?: string | null
  disputeTitle: string
  disputeDescription: string
  status: MediationInviteStatus
  expiresAt: string
  acceptedAt?: string | null
  declinedAt?: string | null
  createdAt: string
  updatedAt: string
  initiatorClient?: PartyRef
}

export interface Mediation {
  id: string
  inviteId: string
  initiatorClientId: string
  respondentClientId: string
  initiatorLawyerId?: string | null
  respondentLawyerId?: string | null
  mediatorId?: string | null
  initiatorMediatorPick?: string | null
  respondentMediatorPick?: string | null
  disputeTitle: string
  disputeDescription: string
  status: MediationStatus
  dailyRoomName?: string | null
  dailyRoomUrl?: string | null
  sessionStartedAt?: string | null
  concludedAt?: string | null
  outcome?: MediationOutcome | null
  settlementTerms?: string | null
  closureNotes?: string | null
  escalatedCaseId?: string | null
  createdAt: string
  updatedAt: string

  initiatorClient?: PartyRef
  respondentClient?: PartyRef
  initiatorLawyer?: PartyRef | null
  respondentLawyer?: PartyRef | null
  mediator?: PartyRef | null
  invite?: MediationInvite
}

export interface MediatorProfile {
  id: string
  name: string
  email?: string
  avatarUrl?: string | null
  specializations?: string[]
  mediationSpecializations?: string[]
  mediatorBio?: string | null
  mediationFee?: number | null
  experienceYears?: number | null
  rating?: number
  languages?: string[]
  city?: string | null
  state?: string | null
}
