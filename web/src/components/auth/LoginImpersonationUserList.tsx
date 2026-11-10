import * as React from "react";
import i18next from "i18next";
import {Loader2} from "lucide-react";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import * as UserBackend from "@/backend/UserBackend";
import * as Setting from "@/lib/setting";

export interface LoginImpersonationUser {
  owner: string;
  name: string;
  displayName?: string;
  avatar?: string;
  email?: string;
}

interface LoginImpersonationUserListProps {
  applicationName: string;
  clientOrigin: string;
  onSelect: (user: LoginImpersonationUser) => void;
  disabled?: boolean;
  className?: string;
}

const PAGE_SIZE = 10;

/** Searchable user list with infinite scroll for passwordless login impersonation. */
export function LoginImpersonationUserList({
  applicationName,
  clientOrigin,
  onSelect,
  disabled,
  className,
}: LoginImpersonationUserListProps) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageCount, setPageCount] = React.useState(1);
  const [users, setUsers] = React.useState<LoginImpersonationUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const requestId = React.useRef(0);
  const loadingRef = React.useRef(false);
  const pageRef = React.useRef(1);
  const pageCountRef = React.useRef(1);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Debounce search and reset to page 1 in the same tick so fetch sees both updates.
  // Do not clear users here — that emptied the list on mount when nothing had changed.
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((prev) => (prev === next ? prev : next));
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [applicationName]);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);

  React.useEffect(() => {
    pageCountRef.current = pageCount;
  }, [pageCount]);

  React.useEffect(() => {
    const id = ++requestId.current;
    loadingRef.current = true;
    setLoading(true);
    UserBackend.getLoginImpersonationUsers(
      applicationName,
      page,
      PAGE_SIZE,
      "name",
      debouncedSearch,
      clientOrigin,
    )
      .then((res: any) => {
        if (id !== requestId.current) {
          return;
        }
        if (res.status === "ok") {
          const next = (res.data ?? []) as LoginImpersonationUser[];
          setUsers((prev) => (page === 1 ? next : [...prev, ...next]));
          setPageCount(Math.max(1, Number(res.data2) || 1));
        } else {
          if (page === 1) {
            setUsers([]);
          }
          setPageCount(1);
          if (res.msg) {
            Setting.showMessage("error", res.msg);
          }
        }
      })
      .catch(() => {
        if (id !== requestId.current) {
          return;
        }
        if (page === 1) {
          setUsers([]);
        }
        setPageCount(1);
      })
      .finally(() => {
        if (id === requestId.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      });
  }, [applicationName, clientOrigin, page, debouncedSearch]);

  React.useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || disabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingRef.current) {
          return;
        }
        if (pageRef.current >= pageCountRef.current) {
          return;
        }
        loadingRef.current = true;
        setPage((p) => p + 1);
      },
      {root, rootMargin: "40px", threshold: 0},
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [disabled, users.length]);

  const titleFor = (user: LoginImpersonationUser) => user.displayName || user.name;
  const showInitialLoading = loading && users.length === 0;

  return (
    <div className={cn("space-y-3", className)}>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={i18next.t("general:Search")}
        disabled={disabled}
      />
      <div ref={scrollRef} className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
        {showInitialLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {i18next.t("general:No data")}
          </div>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={`${user.owner}/${user.name}`}>
                <button
                  type="button"
                  disabled={disabled}
                  className="w-full rounded-lg border bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => onSelect(user)}
                >
                  <div className="truncate text-sm font-medium text-foreground">
                    {titleFor(user)}
                    {user.displayName && user.displayName !== user.name ? (
                      <span className="font-normal text-muted-foreground"> ({user.name})</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{user.owner}</div>
                  {user.email ? (
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div ref={sentinelRef} className="h-1" />
        {loading && users.length > 0 ? (
          <div className="flex items-center justify-center py-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
