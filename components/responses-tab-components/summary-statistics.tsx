interface SummaryStatisticsProps {
  total: number;
  accepted: number;
  pending: number;
  invited: number;
  acceptedNotInvited: number;
}

export function SummaryStatistics({
  total,
  accepted,
  pending,
  invited,
  acceptedNotInvited,
}: SummaryStatisticsProps) {
  return (
    <div className="rounded-lg border p-6 mb-6">
      <div className="text-sm text-muted-foreground">Summary</div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
        <div className="p-2 rounded bg-muted/50">
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-medium">{total}</span>
        </div>
        <div className="p-2 rounded bg-green-500/10">
          <span className="text-muted-foreground">Accepted:</span>{" "}
          <span className="font-medium text-green-600">{accepted}</span>
        </div>
        <div className="p-2 rounded bg-blue-500/10">
          <span className="text-muted-foreground">Invited:</span>{" "}
          <span className="font-medium text-blue-600">{invited}</span>
        </div>
<div className="p-2 rounded bg-purple-500/10">
          <span className="text-muted-foreground">Ready to Invite:</span>{" "}
          <span className="font-medium text-purple-600">{acceptedNotInvited}</span>
        </div>
        <div className="p-2 rounded bg-yellow-500/10">
          <span className="text-muted-foreground">Pending:</span>{" "}
          <span className="font-medium text-yellow-600">{pending}</span>
        </div>
      </div>
    </div>
  );
}