import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CursorPaginationProps {
  nextCursor: string | null;
  onNext: (cursor: string) => void;
  onPrev: () => void;
  hasPrev: boolean;
  total?: number;
  showing: number;
  loading?: boolean;
}

export function CursorPagination({
  nextCursor,
  onNext,
  onPrev,
  hasPrev,
  total,
  showing,
  loading = false,
}: CursorPaginationProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm text-muted-foreground">
        {total !== undefined ? (
          <>
            Showing <span className="font-medium">{showing}</span> of{" "}
            <span className="font-medium">{total}</span>
          </>
        ) : (
          <>
            Showing <span className="font-medium">{showing}</span> results
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev || loading}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => nextCursor && onNext(nextCursor)}
          disabled={!nextCursor || loading}
          aria-label="Next page"
        >
          <span className="mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
