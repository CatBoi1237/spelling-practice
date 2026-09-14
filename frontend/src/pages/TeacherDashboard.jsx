import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  ListChecks,
  Loader2,
  School,
  Users,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getCustomWordLists } from "@/lib/customWordLists";
import { api } from "@/lib/api";

const REPORT_PREFIX = "spellbee.classroom.report.";

function recentClassroomReports() {
  if (typeof window === "undefined") return [];

  const reports = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(REPORT_PREFIX)) continue;

    try {
      const report = JSON.parse(localStorage.getItem(key) || "null");
      if (!report) continue;
      const code = report.code || key.slice(REPORT_PREFIX.length).toUpperCase();
      const rounds = Object.values(report.rounds || {});
      const finalizedRounds = rounds.filter((round) => round?.finalized).length;
      const students = Object.values(report.students || {});
      const latest = rounds
        .map((round) => round?.revealed_at || round?.started_at)
        .filter(Boolean)
        .sort()
        .at(-1);

      reports.push({
        code,
        students: students.length,
        finalizedRounds,
        updatedAt: latest || null,
      });
    } catch {
      // Ignore old or damaged local report entries.
    }
  }

  return reports
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 6);
}

function dueLabel(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const lists = useMemo(() => getCustomWordLists(), []);
  const reports = useMemo(() => recentClassroomReports(), []);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setAssignments([]);
      return;
    }

    let alive = true;
    setAssignmentsLoading(true);
    api.get("/assignments")
      .then(({ data }) => {
        if (alive) setAssignments(data.assignments || []);
      })
      .catch(() => {
        if (alive) setAssignments([]);
      })
      .finally(() => {
        if (alive) setAssignmentsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user]);

  const activeAssignments = assignments.filter((assignment) => assignment.status === "active");
  const assignmentStudents = assignments.reduce((sum, assignment) => sum + Number(assignment.student_count || 0), 0);
  const recentAssignments = assignments.slice(0, 5);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-8 text-center sm:p-12">
        <GraduationCap className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="mt-5 font-heading text-4xl font-black text-slate-50">Teacher tools</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
          Sign in to host Classroom Mode, manage spelling lists, create assignments and keep your teaching tools in one place. Students can still join games and assignments as guests.
        </p>
        <Link
          to="/signin"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
        >
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950/30 p-7 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
              <GraduationCap className="h-3.5 w-3.5" /> Teacher Dashboard
            </span>
            <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
              Ready for class, {user.name}?
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Live classes, homework, synced word lists and student results are now grouped into one teacher workspace.
            </p>
          </div>

          <Link
            to="/multiplayer"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
          >
            <School className="h-4 w-4" /> Host a class
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ListChecks} label="Saved lists" value={lists.length} hint="Cloud-synced teacher lists" />
        <Stat icon={ClipboardList} label="Active assignments" value={assignmentsLoading ? "…" : activeAssignments.length} hint={`${assignments.length} total assignment${assignments.length === 1 ? "" : "s"}`} />
        <Stat icon={Users} label="Assignment students" value={assignmentsLoading ? "…" : assignmentStudents} hint="Completions across your assignments" />
        <Stat icon={BarChart3} label="Classroom reports" value={reports.length} hint="Recent live-class results" />
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          icon={School}
          title="Host Classroom"
          body="Choose a built-in level or one of your custom lists, then start a teacher-led game."
          to="/multiplayer"
          action="Create game"
        />
        <QuickAction
          icon={ClipboardList}
          title="Assignments"
          body="Set independent spelling practice with a due date and attempts, then track every student's results."
          to="/assignments"
          action="Manage assignments"
        />
        <QuickAction
          icon={ListChecks}
          title="My Word Lists"
          body="Create, edit and reuse cloud-synced spelling lists for Classroom, Race Mode and assignments."
          to="/word-lists"
          action="Manage lists"
        />
        <QuickAction
          icon={Users}
          title="Join page"
          body="Show students one join page for Race, Classroom and Assignment codes."
          to="/join"
          action="Open join"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Assignments</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Recent classwork</h2>
            </div>
            <Link to="/assignments" className="text-sm font-bold text-emerald-300 hover:text-emerald-200">View all →</Link>
          </div>

          <div className="mt-5 space-y-3">
            {assignmentsLoading ? (
              <div className="grid place-items-center py-10 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : recentAssignments.length ? recentAssignments.map((assignment) => (
              <Link
                key={assignment.code}
                to={`/assignments/${assignment.code}/report`}
                className="block rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 transition hover:border-emerald-500/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-100">{assignment.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                      <span className="font-mono font-bold tracking-wider text-amber-300">{assignment.code}</span>
                      <span>· {assignment.student_count || 0} students</span>
                      <span>· {assignment.submission_count || 0} attempts</span>
                    </div>
                  </div>
                  <span className={assignment.status === "active" ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300" : "rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500"}>
                    {assignment.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600"><CalendarClock className="h-3 w-3" /> {dueLabel(assignment.due_at)}</div>
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-7 text-center text-sm text-slate-500">
                No assignments yet. Create homework for your first class.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Word lists</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Recently edited</h2>
            </div>
            <Link to="/word-lists" className="text-sm font-bold text-amber-400 hover:text-amber-300">View all →</Link>
          </div>

          <div className="mt-5 space-y-3">
            {lists.length ? lists.slice(0, 5).map((list) => (
              <div key={list.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-100">{list.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{list.words.length} words · synced</div>
                </div>
                <Link to="/word-lists" className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-amber-500/40 hover:text-amber-300">Open</Link>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-7 text-center text-sm text-slate-500">
                No custom lists yet. Create one and it will follow your signed-in account.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Classroom history</div>
            <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Recent reports</h2>
            <p className="mt-1 text-xs text-slate-500">Live Classroom reports are currently saved on the teacher device that ran the class.</p>
          </div>

          <div className="mt-5 space-y-3">
            {reports.length ? reports.slice(0, 5).map((report) => (
              <Link
                key={report.code}
                to={`/classroom/${report.code}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 transition hover:border-indigo-500/35"
              >
                <div>
                  <div className="font-mono text-lg font-black tracking-[0.14em] text-slate-100">{report.code}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{report.students} students · {report.finalizedRounds} scored rounds</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-7 text-center text-sm text-slate-500">
                Classroom reports will appear here after you run a live game on this device.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, body, to, action }) {
  return (
    <Link to={to} className="group rounded-3xl border border-slate-800 bg-slate-900/40 p-6 transition hover:-translate-y-0.5 hover:border-amber-500/35">
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 font-heading text-xl font-bold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-amber-400">
        {action} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
