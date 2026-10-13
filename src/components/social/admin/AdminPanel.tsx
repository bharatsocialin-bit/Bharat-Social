'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, Flag, Ban, TrendingUp, Clock,
  CheckCircle2, XCircle, AlertCircle, Trash2, Search,
  Loader2, ChevronRight, ArrowLeft, Film, RotateCcw, Brain, Plus, Pencil, Award, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/social/EmptyState';

type Tab = 'dashboard' | 'reports' | 'users' | 'shorts' | 'quiz' | 'badges';

interface Stats {
  counts: {
    users: number; posts: number; comments: number; likes: number;
    bookmarks: number; follows: number; blocks: number;
    reportsPending: number; reportsReviewed: number; reportsDismissed: number;
  };
  recentUsers: { id: string; username: string; name: string; createdAt: string; role: string }[];
  recentPosts: { id: string; content: string; createdAt: string; author: { id: string; username: string; name: string } }[];
}

interface ReportItem {
  id: string; reason: string; status: string; createdAt: string;
  reporter: { id: string; username: string; name: string };
  reportedUserId: string | null;
  post: { id: string; content: string; authorId: string } | null;
}

interface UserItem {
  id: string; username: string; name: string; email: string; role: string;
  createdAt: string; state: string | null; city: string | null;
  postsCount: number; followersCount: number; followingCount: number;
}

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { toast } = useToast();

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center gap-2 px-4 pt-3">
          <ShieldIcon />
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          <span className="ml-2 rounded-full bg-saffron/15 px-2 py-0.5 text-xs font-medium text-saffron ring-1 ring-saffron/30">
            Restricted
          </span>
        </div>
        {/* Tabs */}
        <div role="tablist" className="flex">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { key: 'reports', label: 'Reports', icon: Flag },
            { key: 'users', label: 'Users', icon: Users },
            { key: 'shorts', label: 'Shorts', icon: Film },
            { key: 'quiz', label: 'Quiz', icon: Brain },
            { key: 'badges', label: 'Badges', icon: Award },
          ] as { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className="group relative flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-saffron-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-saffron"
              >
                <Icon className={cn('h-4 w-4', active ? 'text-saffron' : 'text-white/50')} />
                <span className={cn(active ? 'text-white font-semibold' : 'text-white/50')}>{label}</span>
                <span className={cn('absolute inset-x-0 -bottom-px h-[3px] bg-saffron transition-transform', active ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'shorts' && <ShortsTab />}
        {tab === 'quiz' && <QuizAdminTab />}
        {tab === 'badges' && <BadgesAdminTab />}
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-saffron" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorState />;

  return (
    <div className="space-y-4 p-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Users" value={stats.counts.users} color="text-sky-400" />
        <StatCard icon={FileText} label="Posts" value={stats.counts.posts} color="text-emerald-400" />
        <StatCard icon={Flag} label="Pending Reports" value={stats.counts.reportsPending} color="text-amber-400" />
        <StatCard icon={Ban} label="Blocks" value={stats.counts.blocks} color="text-rose-400" />
        <StatCard icon={Clock} label="Comments" value={stats.counts.comments} color="text-violet-400" />
        <StatCard icon={CheckCircle2} label="Reviewed Reports" value={stats.counts.reportsReviewed} color="text-teal-400" />
        <StatCard icon={TrendingUp} label="Follows" value={stats.counts.follows} color="text-indigo-400" />
        <StatCard icon={AlertCircle} label="Likes" value={stats.counts.likes} color="text-pink-400" />
      </div>

      {/* Recent users */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-white">Recent Registrations</h2>
        {stats.recentUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <ul className="space-y-2">
            {stats.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {u.role === 'admin' && (
                  <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-[10px] font-medium text-saffron">admin</span>
                )}
                <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent posts */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-white">Recent Posts</h2>
        {stats.recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <ul className="space-y-2">
            {stats.recentPosts.map((p) => (
              <li key={p.id} className="border-b border-border/50 pb-2 last:border-0">
                <p className="text-sm text-white line-clamp-2">{p.content}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">by @{p.author.username} · {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────

function ReportsTab() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const loadReports = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/reports?status=${filter}&page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.reports) {
          setReports(d.reports);
          setTotalPages(d.totalPages);
        }
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: `Report marked as ${status}` });
      loadReports();
    } catch {
      toast({ title: 'Error', description: 'Failed to update report', variant: 'destructive' });
    }
  }

  async function deletePost(postId: string, reportId: string) {
    if (!confirm('Are you sure you want to remove this post? It will be hidden from the feed but can be restored later.')) return;
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'x-confirm-delete': 'true' },
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Post removed', description: 'The post has been hidden. It can be restored from the audit log.' });
      await updateStatus(reportId, 'reviewed');
    } catch {
      toast({ title: 'Error', description: 'Failed to remove post', variant: 'destructive' });
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-3 p-4">
      {/* Filter buttons */}
      <div className="flex gap-2">
        {[
          { key: 'pending', label: 'Pending', color: 'text-amber-400' },
          { key: 'reviewed', label: 'Reviewed', color: 'text-teal-400' },
          { key: 'dismissed', label: 'Dismissed', color: 'text-muted-foreground' },
          { key: '', label: 'All', color: 'text-white' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === f.key ? 'bg-saffron text-white' : 'bg-card border border-border text-white/60 hover:bg-saffron-soft/30',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description={`No ${filter || ''} reports found.`} />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  r.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                  r.status === 'reviewed' ? 'bg-teal-50 text-teal-700' :
                  'bg-muted text-muted-foreground',
                )}>
                  {r.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-white">
                <span className="font-medium">Reason:</span> {r.reason}
              </p>
              {r.post && (
                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2">
                  <p className="text-xs text-white/80 line-clamp-3">{r.post.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Post ID: {r.post.id.slice(0, 12)}…</p>
                </div>
              )}
              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(r.id, 'reviewed')}
                      className="rounded-full bg-teal-500/15 px-3 py-1 text-xs font-medium text-teal-400 ring-1 ring-teal-500/30 hover:bg-teal-500/25"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'dismissed')}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
                    >
                      Dismiss
                    </button>
                    {r.post && (
                      <button
                        onClick={() => deletePost(r.post!.id, r.id)}
                        className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/25"
                      >
                        <Trash2 className="mr-1 inline h-3 w-3" />
                        Delete Post
                      </button>
                    )}
                  </>
                )}
                {r.status !== 'pending' && (
                  <button
                    onClick={() => updateStatus(r.id, 'pending')}
                    className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
                  >
                    Reopen
                  </button>
                )}
              </div>
              {/* Reporter info — only visible to admin */}
              <p className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                Reported by @{r.reporter.username} · Reporter ID: {r.reporter.id.slice(0, 12)}…
              </p>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full border border-border px-3 py-1 text-xs text-white disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-border px-3 py-1 text-xs text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${page}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.users) {
            setUsers(d.users);
            setTotalPages(d.totalPages);
          }
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, page]);

  return (
    <div className="space-y-3 p-4">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2.5 focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/20">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search by username, name, or email…"
          className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
          type="search"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search." />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{u.name}</p>
                    {u.role === 'admin' && (
                      <span className="rounded-full bg-saffron/15 px-1.5 py-0.5 text-[10px] font-medium text-saffron">admin</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{u.postsCount} posts</p>
                  <p>{u.followersCount} followers</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{u.email}</span>
                <span>Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {u.city && <span>{u.city}, {u.state}</span>}
              </div>
              {/* Suspend/Reactivate actions */}
              {u.role !== 'admin' && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={async () => {
                      const action = 'suspend';
                      if (!confirm(`Suspend @${u.username}? They will be unable to log in or perform actions.`)) return;
                      try {
                        const res = await fetch(`/api/admin/users/${u.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action }),
                        });
                        if (!res.ok) {
                          const d = await res.json();
                          throw new Error(d.error || 'Failed');
                        }
                        toast({ title: `User @${u.username} suspended` });
                        // Refresh list
                        setUsers((prev) => prev.map((pu) => pu.id === u.id ? { ...pu } : pu));
                      } catch (e) {
                        toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
                      }
                    }}
                    className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/25"
                  >
                    Suspend
                  </button>
                </div>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full border border-border px-3 py-1 text-xs text-white disabled:opacity-30">Previous</button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-full border border-border px-3 py-1 text-xs text-white disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-saffron" />
    </div>
  );
}

function ErrorState() {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Access denied"
      description="You need admin privileges to view this page."
    />
  );
}

// ── Shorts Tab ─────────────────────────────────────────────────────────────

interface ShortItem {
  id: string;
  creatorId: string;
  creator: { id: string; name: string; username: string };
  caption: string;
  hashtags: string[];
  language: string;
  videoUrl: string | null;
  duration: number | null;
  audioTitle: string | null;
  moderationStatus: string;
  deletedAt: string | null;
  createdAt: string;
  counts: {
    likes: number;
    comments: number;
    reposts: number;
    reports: number;
  };
}

function ShortsTab() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const { toast } = useToast();

  const loadShorts = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/shorts?filter=${filter}${cursor ? `&cursor=${cursor}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.shorts) {
          setShorts(d.shorts);
          setHasMore(!!d.nextCursor);
          setCursor(d.nextCursor || null);
        }
      })
      .finally(() => setLoading(false));
  }, [filter, cursor]);

  useEffect(() => {
    setCursor(null);
    setPage(1);
    setShorts([]);
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/shorts?filter=${filter}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.shorts) {
            setShorts(d.shorts);
            setHasMore(!!d.nextCursor);
            setCursor(d.nextCursor || null);
          }
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [filter]);

  async function deleteShort(id: string, creatorId: string) {
    if (!confirm('Remove this short? It will be hidden from the feed but kept in the audit log.')) return;
    try {
      const res = await fetch(`/api/admin/shorts/${id}`, {
        method: 'DELETE',
        headers: { 'x-confirm-delete': 'true' },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      toast({ title: 'Short removed', description: 'The short has been hidden. Audit log updated.' });
      setShorts((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      });
    }
  }

  async function restoreShort(id: string) {
    if (!confirm('Restore this short to the feed?')) return;
    try {
      const res = await fetch(`/api/admin/shorts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      toast({ title: 'Short restored' });
      setShorts((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-3 p-4">
      {/* Filter chips */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active', color: 'text-emerald-400' },
          { key: 'deleted', label: 'Deleted', color: 'text-rose-400' },
          { key: 'removed', label: 'Moderated', color: 'text-amber-400' },
          { key: 'all', label: 'All', color: 'text-white' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === f.key ? 'bg-saffron text-white' : 'bg-card border border-border text-white/60 hover:bg-saffron-soft/30',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : shorts.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No shorts"
          description={`No ${filter} shorts found.`}
        />
      ) : (
        <div className="space-y-3">
          {shorts.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    s.deletedAt
                      ? 'bg-rose-500/15 text-rose-400'
                      : s.moderationStatus === 'removed'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-400',
                  )}
                >
                  {s.deletedAt ? 'deleted' : s.moderationStatus === 'removed' ? 'moderated' : 'active'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                {s.duration && (
                  <span className="text-xs text-muted-foreground">{Math.round(s.duration)}s</span>
                )}
              </div>

              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="aspect-[9/16] h-24 shrink-0 overflow-hidden rounded-lg bg-black">
                  {s.videoUrl ? (
                    <video src={s.videoUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film className="h-6 w-6 text-white/30" />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white line-clamp-2">{s.caption}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    by @{s.creator.username} · ID: {s.id.slice(0, 12)}…
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{s.counts.likes} likes</span>
                    <span>{s.counts.comments} comments</span>
                    <span>{s.counts.reposts} reposts</span>
                    {s.counts.reports > 0 && (
                      <span className="text-amber-400">{s.counts.reports} reports</span>
                    )}
                  </div>
                  {s.hashtags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.hashtags.slice(0, 5).map((t) => (
                        <span key={t} className="text-[10px] text-saffron">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {s.deletedAt ? (
                  <button
                    onClick={() => restoreShort(s.id)}
                    className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    <RotateCcw className="mr-1 inline h-3 w-3" />
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={() => deleteShort(s.id, s.creatorId)}
                    className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/25"
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" />
                    Remove short
                  </button>
                )}
                {s.videoUrl && (
                  <a
                    href={s.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                  >
                    Open video
                  </a>
                )}
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => loadShorts()}
              className="mx-auto block rounded-full border border-border px-4 py-2 text-xs text-white/70 hover:bg-white/5"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quiz Admin Tab ──────────────────────────────────────────────────────────

interface AdminQuestion {
  id: string;
  categoryId: string;
  text: string;
  options: Array<{ id: string; text: string; translations?: Record<string, string> }>;
  correctOptionIndex: number;
  explanation: string;
  source: string | null;
  difficulty: string;
  published: boolean;
  createdAt: string;
}

const QUIZ_CATEGORIES_FOR_ADMIN = [
  { id: 'cat-gk', label: 'General Knowledge' },
  { id: 'cat-history', label: 'History' },
  { id: 'cat-geography', label: 'Geography' },
  { id: 'cat-civics', label: 'Constitution & Civics' },
  { id: 'cat-science', label: 'Science & Technology' },
  { id: 'cat-sports', label: 'Sports' },
  { id: 'cat-culture', label: 'Culture & Heritage' },
  { id: 'cat-edu', label: 'Education & Exam Practice' },
];

function QuizAdminTab() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const loadQuestions = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/quiz-questions?limit=100')
      .then((r) => r.json())
      .then((d) => {
        if (d.questions) setQuestions(d.questions);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function togglePublish(q: AdminQuestion) {
    try {
      const res = await fetch(`/api/admin/quiz-questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !q.published }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: `Question ${q.published ? 'unpublished' : 'published'}` });
      loadQuestions();
    } catch {
      toast({ title: 'Error', description: 'Failed to update question', variant: 'destructive' });
    }
  }

  async function deleteQuestion(q: AdminQuestion) {
    if (!confirm(`Delete this question permanently?\n\n"${q.text.slice(0, 80)}…"`)) return;
    try {
      const res = await fetch(`/api/admin/quiz-questions/${q.id}`, {
        method: 'DELETE',
        headers: { 'x-confirm-delete': 'true' },
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Question deleted' });
      loadQuestions();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  }

  const filtered = filter
    ? questions.filter((q) =>
        q.text.toLowerCase().includes(filter.toLowerCase()) ||
        q.categoryId.toLowerCase().includes(filter.toLowerCase()))
    : questions;

  if (creating) {
    return <QuestionEditor onClose={() => { setCreating(false); loadQuestions(); }} />;
  }
  if (editingId) {
    const q = questions.find((x) => x.id === editingId);
    if (q) return <QuestionEditor existing={q} onClose={() => { setEditingId(null); loadQuestions(); }} />;
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search questions by text or category…"
          className="flex-1 rounded-full border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-saffron focus:outline-none"
        />
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-saffron px-3 py-2 text-xs font-semibold text-white hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Brain} title="No questions" description="No questions match your search." />
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-3">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    q.published
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400',
                  )}
                >
                  {q.published ? 'published' : 'draft'}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-white/60">
                  {q.categoryId}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-white/60">
                  {q.difficulty}
                </span>
              </div>
              <p className="text-sm text-white line-clamp-2">{q.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Correct: {q.options[q.correctOptionIndex]?.text || '?'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => togglePublish(q)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium ring-1',
                    q.published
                      ? 'bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400 ring-amber-500/30 hover:bg-amber-500/25'
                      : 'bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/25',
                  )}
                >
                  {q.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => setEditingId(q.id)}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                >
                  <Pencil className="mr-1 inline h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => deleteQuestion(q)}
                  className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/25"
                >
                  <Trash2 className="mr-1 inline h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  existing,
  onClose,
}: {
  existing?: AdminQuestion;
  onClose: () => void;
}) {
  const [categoryId, setCategoryId] = useState(existing?.categoryId || 'cat-gk');
  const [text, setText] = useState(existing?.text || '');
  const [options, setOptions] = useState<Array<{ id: string; text: string }>>(
    existing?.options?.map((o) => ({ id: o.id, text: o.text })) || [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
  );
  const [correctIndex, setCorrectIndex] = useState(existing?.correctOptionIndex ?? 0);
  const [explanation, setExplanation] = useState(existing?.explanation || '');
  const [source, setSource] = useState(existing?.source || '');
  const [difficulty, setDifficulty] = useState(existing?.difficulty || 'medium');
  const [published, setPublished] = useState(existing?.published ?? false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    if (!text.trim()) {
      toast({ title: 'Question text is required', variant: 'destructive' });
      return;
    }
    if (options.some((o) => !o.text.trim())) {
      toast({ title: 'All options must have text', variant: 'destructive' });
      return;
    }
    if (!explanation.trim()) {
      toast({ title: 'Explanation is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        categoryId,
        text: text.trim(),
        options,
        correctOptionId: options[correctIndex].id,
        explanation: explanation.trim(),
        source: source.trim() || null,
        difficulty,
        published,
      };
      const res = existing
        ? await fetch(`/api/admin/quiz-questions/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/admin/quiz-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      toast({ title: existing ? 'Question updated' : 'Question created' });
      onClose();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-base font-semibold text-white">
          {existing ? 'Edit Question' : 'New Question'}
        </h2>
      </div>

      {/* Category */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-white focus:border-saffron focus:outline-none"
        >
          {QUIZ_CATEGORIES_FOR_ADMIN.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Difficulty</label>
        <div className="flex gap-2">
          {['easy', 'medium', 'hard'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                difficulty === d
                  ? 'bg-saffron text-white'
                  : 'bg-card border border-border text-white/60 hover:bg-saffron-soft/30',
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Question text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none"
          placeholder="e.g. Who was the first Prime Minister of India?"
        />
      </div>

      {/* Options + correct selector */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Options (select the correct one)</label>
        <div className="space-y-2">
          {options.map((o, idx) => (
            <div key={o.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrectIndex(idx)}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  correctIndex === idx
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                    : 'bg-secondary text-white/60',
                )}
                aria-label={`Mark option ${idx + 1} as correct`}
              >
                {String.fromCharCode(65 + idx)}
              </button>
              <input
                value={o.text}
                onChange={(e) => {
                  const next = [...options];
                  next[idx] = { ...o, text: e.target.value };
                  setOptions(next);
                }}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none"
                placeholder={`Option ${idx + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Explanation</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none"
          placeholder="Brief explanation of why the answer is correct."
        />
      </div>

      {/* Source */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Source (optional)</label>
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          maxLength={200}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none"
          placeholder="e.g. Constitution of India, Article 79"
        />
      </div>

      {/* Published */}
      <label className="flex items-center gap-2 text-sm text-white">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 accent-saffron"
        />
        Published (visible to users)
      </label>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : existing ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}

// ── Badges Admin Tab ────────────────────────────────────────────────────────

interface AdminBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  rarity: string;
  group: string;
  criteriaType: string;
  criteriaValue: number | null;
  active: boolean;
  hint: string | null;
  awardCount: number;
  createdAt: string;
}

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'Common', color: 'text-slate-400' },
  uncommon: { label: 'Uncommon', color: 'text-emerald-400' },
  rare: { label: 'Rare', color: 'text-sky-400' },
  epic: { label: 'Epic', color: 'text-violet-400' },
  legendary: { label: 'Legendary', color: 'text-amber-400' },
};

const GROUP_LABELS_BADGES: Record<string, string> = {
  quiz: 'India Quiz',
  streak: 'Streaks',
  points: 'Points',
  chat: 'Chat & Community',
  platform: 'Platform',
};

function BadgesAdminTab() {
  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBadges = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/badges')
      .then((r) => r.json())
      .then((d) => {
        if (d.badges) setBadges(d.badges);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  async function toggleActive(b: AdminBadge) {
    try {
      const res = await fetch(`/api/admin/badges/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !b.active }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: `Badge ${b.active ? 'deactivated' : 'activated'}` });
      loadBadges();
    } catch {
      toast({ title: 'Error', description: 'Failed to update badge', variant: 'destructive' });
    }
  }

  const filtered = badges.filter((b) => {
    if (groupFilter && b.group !== groupFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.slug.includes(q) || b.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by group for display
  const grouped: Record<string, AdminBadge[]> = {};
  for (const b of filtered) {
    if (!grouped[b.group]) grouped[b.group] = [];
    grouped[b.group].push(b);
  }

  if (editingId) {
    const b = badges.find((x) => x.id === editingId);
    if (b) return <BadgeEditor existing={b} onClose={() => { setEditingId(null); loadBadges(); }} />;
  }

  return (
    <div className="space-y-3 p-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-white">{badges.length}</p>
          <p className="text-xs text-muted-foreground">Total badges</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{badges.filter((b) => b.active).length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-saffron">
            {badges.reduce((sum, b) => sum + b.awardCount, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total awards</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search badges by name, slug, or description…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-full border border-border bg-card px-3 py-2 text-sm text-white focus:border-saffron focus:outline-none"
        >
          <option value="">All groups</option>
          {Object.entries(GROUP_LABELS_BADGES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, groupBadges]) => (
            <div key={group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS_BADGES[group] || group} ({groupBadges.length})
              </h3>
              <div className="space-y-2">
                {groupBadges.map((b) => {
                  const rarity = RARITY_LABELS[b.rarity] || RARITY_LABELS.common;
                  return (
                    <div key={b.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start gap-3">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', b.gradient)}>
                          <BadgeIconHelper iconName={b.icon} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{b.name}</p>
                            <span className={cn('rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium', rarity.color)}>
                              {rarity.label}
                            </span>
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                              b.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
                            )}>
                              {b.active ? 'active' : 'inactive'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{b.description}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span>Slug: <code className="rounded bg-white/5 px-1">{b.slug}</code></span>
                            <span>Criteria: {b.criteriaType}{b.criteriaValue !== null ? ` = ${b.criteriaValue}` : ''}</span>
                            <span className="text-saffron">{b.awardCount} awarded</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleActive(b)}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-medium ring-1',
                            b.active
                              ? 'bg-amber-500/15 text-amber-400 ring-amber-500/30 hover:bg-amber-500/25'
                              : 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/25',
                          )}
                        >
                          {b.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setEditingId(b.id)}
                          className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                        >
                          <Pencil className="mr-1 inline h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <EmptyState icon={Award} title="No badges found" description="No badges match your search." />
          )}
        </div>
      )}
    </div>
  );
}

function BadgeIconHelper({ iconName }: { iconName: string }) {
  // Use the already-imported LucideIcons namespace (the file imports `* as LucideIcons`
  // at the top — but we don't here. Use a static map instead for the common icons.
  const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    sparkles: Award,
    trophy: TrendingUp,
    flame: Clock,
    award: Award,
    star: Star,
    'book-open': FileText,
    brain: Brain,
    'graduation-cap': Brain,
    crown: Award,
    compass: Search,
    target: TrendingUp,
    library: FileText,
    'user-check': Users,
    feather: FileText,
    'message-square': FileText,
    users: Users,
    'pen-tool': FileText,
    film: Film,
    'calendar-check': Clock,
    'message-circle': FileText,
    heart: Award,
    'thumbs-up': Award,
  };
  const Icon = ICONS[iconName] || Award;
  return <Icon className="h-5 w-5" />;
}

function BadgeEditor({
  existing,
  onClose,
}: {
  existing: AdminBadge;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(existing.description);
  const [hint, setHint] = useState(existing.hint || '');
  const [rarity, setRarity] = useState(existing.rarity);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/badges/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          hint: hint.trim() || null,
          rarity,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      toast({ title: 'Badge updated' });
      onClose();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-base font-semibold text-white">Edit Badge</h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">Slug (immutable)</p>
        <code className="text-sm text-saffron">{existing.slug}</code>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">Name (immutable)</p>
        <p className="text-sm text-white">{existing.name}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Hint (how to earn)</label>
        <textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. Play 7 consecutive days of quizzes."
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white/70">Rarity</label>
        <div className="flex gap-2">
          {['common', 'uncommon', 'rare', 'epic', 'legendary'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRarity(r)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium capitalize',
                rarity === r
                  ? 'bg-saffron text-white'
                  : 'bg-card border border-border text-white/60 hover:bg-saffron-soft/30',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/10 p-3 text-xs text-amber-200">
        ⚠ Note: slug, criteria, icon, and gradient are immutable from the admin panel.
        To change those, update the seed script and re-run.
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
