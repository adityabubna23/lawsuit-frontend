import api, { apiEndpoints } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

interface getCaseDetailsResponse {
    data: {
    title: string;
    description: string;
    category: string;
    id: string;
    status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "PENDING_DOCUMENTS" | "UNDER_REVIEW" | "HEARING_SCHEDULED" | "WON" | "LOST" | "SETTLED";
    caseNumber: string | null;
    courtName: string | null;
    isAccepted: boolean;
    startedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    disputeResolutionMethod: "TRIAL" | "MEDIATION" | "ARBITRATION" | null;
    client: {
        id: string;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
    };
    lawyer: {
        id: string;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
    } | null;
    appointment: {
        id: string;
        status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
        notes: string | null;
        scheduledAt: Date;
        durationMins: number;
        meetingLink: string | null;
    } | null;
}[]
};

export default function CaseDetailsClientPage() {

    const { caseId } = useParams<{ caseId: string }>();
    if (!caseId) return <div>case id not found</div>;

    const getCaseDetailsQuery = useQuery({
        queryKey: ['caseDetailsClient'],
        queryFn: async () => {
            const res = await api.get<getCaseDetailsResponse>(apiEndpoints.case.getCaseDetails(caseId));
            return res.data;
        },
        enabled: !!caseId,
    })
    return (
        <div className="bg-gray-50">

        </div>
    )
}