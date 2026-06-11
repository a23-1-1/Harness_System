import { useCallback, useEffect, useState } from "react";

export interface TeacherProfile {
  teacher_id: string;
  display_name: string;
  email: string;
  avatar_url: string;
  role: string;
  style: Record<string, string>;
  preferences: Record<string, string>;
  teaching_subjects: string[];
  updated_at?: string;
}

export const TEACHER_ID_STORAGE_KEY = "dbdemo_teacher_id";

export function readStoredTeacherId(): string {
  try {
    return localStorage.getItem(TEACHER_ID_STORAGE_KEY) || "default";
  } catch {
    return "default";
  }
}

export function writeStoredTeacherId(id: string): void {
  try {
    localStorage.setItem(TEACHER_ID_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function useTeacherProfile(teacherId: string) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v5/teacher/profile?teacher_id=${encodeURIComponent(teacherId)}`,
      );
      if (res.ok) {
        setProfile((await res.json()) as TeacherProfile);
      }
    } catch (err) {
      console.error("加载用户资料失败:", err);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (patch: Partial<TeacherProfile>) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/v5/teacher/profile?teacher_id=${encodeURIComponent(teacherId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (res.ok) {
        const updated = (await res.json()) as TeacherProfile;
        setProfile(updated);
        return updated;
      }
    } catch (err) {
      console.error("保存用户资料失败:", err);
    } finally {
      setSaving(false);
    }
    return null;
  };

  return { profile, loading, saving, saveProfile, refresh: fetchProfile };
}
