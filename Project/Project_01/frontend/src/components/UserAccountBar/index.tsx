import { useState } from "react";
import {
  ChevronUp,
  Loader2,
  LogOut,
  Settings2,
  UserCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  useTeacherProfile,
  writeStoredTeacherId,
  type TeacherProfile,
} from "../../hooks/useTeacherProfile";

interface Props {
  teacherId: string;
  connected: boolean;
  onTeacherIdChange: (id: string) => void;
}

export function UserAccountBar({ teacherId, connected, onTeacherIdChange }: Props) {
  const { profile, loading, saving, saveProfile } = useTeacherProfile(teacherId);
  const [expanded, setExpanded] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [switchId, setSwitchId] = useState("");

  const displayName = profile?.display_name || teacherId;
  const initial = displayName.slice(0, 1).toUpperCase();

  const openEditor = () => {
    setEditName(profile?.display_name || "");
    setEditNotes(String(profile?.style?.notes || ""));
    setSwitchId(teacherId);
    setExpanded(true);
  };

  const handleSave = async () => {
    const patch: Partial<TeacherProfile> = {
      display_name: editName.trim() || teacherId,
      style: { ...(profile?.style || {}), notes: editNotes.trim() },
    };
    await saveProfile(patch);
    setExpanded(false);
  };

  const handleSwitchUser = () => {
    const next = switchId.trim();
    if (!next || next === teacherId) {
      setExpanded(false);
      return;
    }
    writeStoredTeacherId(next);
    onTeacherIdChange(next);
    setExpanded(false);
  };

  return (
    <div className="relative border-t border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={() => (expanded ? setExpanded(false) : openEditor())}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-100"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {loading ? "加载中…" : displayName}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-500" />
                教师 · 已连接
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-400" />
                教师 · 未连接
              </>
            )}
          </span>
        </span>
        <Settings2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
      </button>

      {expanded && (
        <div className="absolute bottom-full left-0 right-0 z-30 mx-2 mb-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              账户与偏好
            </p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>

          <label className="block text-xs font-medium text-slate-600">显示名称</label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="例如：张老师"
          />

          <label className="mt-3 block text-xs font-medium text-slate-600">教学风格备注</label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="例如：偏口语、多举例、10 分钟课堂"
          />

          <label className="mt-3 block text-xs font-medium text-slate-600">切换教师 ID</label>
          <div className="mt-1 flex gap-2">
            <input
              value={switchId}
              onChange={(e) => setSwitchId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="teacher-001"
            />
            <button
              type="button"
              onClick={handleSwitchUser}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              title="切换账户"
            >
              <LogOut className="h-3.5 w-3.5" />
              切换
            </button>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            当前 ID：<span className="font-mono">{teacherId}</span>
          </p>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCircle2 className="h-4 w-4" />}
            保存资料
          </button>
        </div>
      )}
    </div>
  );
}
