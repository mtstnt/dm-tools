"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface MemberForm {
  id: number;
  name: string;
  nij?: number;
  email?: string;
  nickname?: string;
  role: "Member" | "SPV" | "PIC";
  isAdmin?: boolean;
}


export default function MembersPage() {
  const [members, setMembers] = useState<MemberForm[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<MemberForm>({ id: Date.now(), name: "", nij: undefined, email: "", nickname: "", role: "Member", isAdmin: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "members"));
        const rows: MemberForm[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const role = (data.role ?? "Member") as MemberForm["role"];
          return {
            id: data.id ?? Number(d.id) ?? Date.now(),
            name: data.name ?? "",
            nij: data.nij ?? undefined,
            email: data.email ?? "",
            nickname: data.nickname ?? "",
            role,
            isAdmin: role === "PIC" ? !!data.isAdmin : false,
          };
        });
        if (mounted) setMembers(rows);
      } catch (e) {
        if (mounted) setMembers([]);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const resetForm = () => setForm({ id: Date.now(), name: "", nij: undefined, email: "", nickname: "", role: "Member", isAdmin: false });

  const save = () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    const normalizedEmail = form.email?.trim().toLowerCase();
    if (normalizedEmail) {
      const same = members.find((m) => (m.email || "").toLowerCase() === normalizedEmail && m.id !== form.id);
      if (same) {
        setError("Email sudah dipakai oleh anggota lain");
        return;
      }
    }

    const prepared = {
      ...form,
      email: normalizedEmail || undefined,
      isAdmin: !!form.isAdmin,
    };

    const doSave = async () => {
      try {
        const idStr = String(prepared.id);
        await setDoc(doc(db, "members", idStr), prepared);
        if (editing) {
          setMembers((prev) => prev.map((m) => (m.id === editing ? prepared : m)));
          setEditing(null);
        } else {
          setMembers((prev) => [...prev, prepared]);
        }
        resetForm();
      } catch (e: any) {
        setError(`Gagal menyimpan ke Firestore: ${e?.message || "server error"}`);
      }
    };
    void doSave();
  };

  const edit = (id: number) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    setForm(m);
    setEditing(id);
  };

  const remove = (id: number) => {
    // remove from firestore and local state
    const doRemove = async () => {
      try { await deleteDoc(doc(db, "members", String(id))); } catch {}
      setMembers((prev) => prev.filter((m) => m.id !== id));
    };
    void doRemove();
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Members</CardTitle>
          <CardDescription>Input data member — Nama Lengkap, NIJ, Email, Nickname, Role, Admin</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Input placeholder="Nama Lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <Input placeholder="NIJ (angka)" value={form.nij ?? ""} onChange={(e) => setForm({ ...form, nij: e.target.value ? Number(e.target.value) : undefined })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">Role</label>
            <select className="border rounded p-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
              <option value="Member">Member</option>
              <option value="SPV">SPV</option>
              <option value="PIC">PIC</option>
            </select>
            <label className="ml-4 text-sm flex items-center gap-2">
              <input type="checkbox" checked={!!form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
              <span>Admin</span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={save}>{editing ? "Update" : "Tambah"}</Button>
            <Button variant="outline" onClick={resetForm}>Reset</Button>
          </div>

          <div className="mt-6">
            {error && <div className="mb-2 text-sm text-red-400">⚠ {error}</div>}
            <div className="text-sm text-muted-foreground mb-2">Daftar anggota ({members.length})</div>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="p-2 border rounded flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name} {m.nickname ? `(${m.nickname})` : ""}</div>
                    <div className="text-xs text-muted-foreground">NIJ: {m.nij ?? "-"} · {m.email || "-"} · {m.role} {m.isAdmin ? "· ADMIN" : ""}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => edit(m.id)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(m.id)}>Hapus</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
