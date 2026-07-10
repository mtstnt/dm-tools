"use client";

import { useEffect, useMemo, useState } from "react";
import ReactSelect from "react-select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { collection, getDocs, setDoc, addDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { WebAuthGuard, getWebAuthCookie } from "@/components/web-auth-guard";
import { fetchAllUsers } from "@/actions/legacy-web/users/fetch-all";
import type { EventUser } from "@/types/event";

interface SelectOption {
  label: string;
  value: string;
}

interface MemberForm {
  id: string;
  name: string;
  nij?: number;
  email?: string;
  nickname?: string;
  team?: string;
  role: "Member" | "SPV" | "PIC";
  isAdmin?: boolean;
  sourceId?: number;
}

const defaultForm: MemberForm = {
  id: "",
  name: "",
  nij: undefined,
  email: "",
  nickname: "",
  team: "",
  role: "Member",
  isAdmin: false,
  sourceId: undefined,
};

function MembersContent() {
  const [members, setMembers] = useState<MemberForm[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>({ ...defaultForm });
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");

  const [allUsers, setAllUsers] = useState<EventUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      const cookie = getWebAuthCookie();
      if (!cookie) {
        setUsersError("Web auth required to fetch users");
        return;
      }
      setUsersLoading(true);
      setUsersError(null);
      try {
        const users = await fetchAllUsers({ cookie, csrf: "" });
        if (mounted) setAllUsers(users);
      } catch (e: any) {
        if (mounted) setUsersError(e?.message || "Failed to fetch users");
      } finally {
        if (mounted) setUsersLoading(false);
      }
    };
    void loadUsers();
    return () => { mounted = false };
  }, []);

  const userOptions = useMemo<SelectOption[]>(
    () => allUsers.map((u) => ({ label: u.fullName, value: String(u.id) })),
    [allUsers],
  );

  const selectedSourceUser = useMemo<SelectOption | null>(
    () => form.sourceId ? (userOptions.find((o) => o.value === String(form.sourceId)) ?? null) : null,
    [form.sourceId, userOptions],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "members"));
        const rows: MemberForm[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const role = (data.role ?? "Member") as MemberForm["role"];

        return {
          id: d.id,
          name: data.name ?? "",
          nij: data.nij ?? undefined,
          email: data.email ?? "",
          nickname: data.nickname ?? "",
          team: data.team ?? "",
          role,
          isAdmin: !!data.isAdmin,
          sourceId: data.sourceId ?? undefined,
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

  const distinctTeams = useMemo(
    () =>
      [...new Set(members.map((m) => m.team).filter((t): t is string => !!t))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [members],
  );

  const teamItems = useMemo(
    () => Object.fromEntries(distinctTeams.map((t) => [t, `Team ${t}`])),
    [distinctTeams],
  );

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members
      .filter((m) => {
        if (teamFilter !== "all" && m.team !== teamFilter) return false;
        if (query && !m.name.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, searchQuery, teamFilter]);

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditing(null);
    setError(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    setForm(m);
    setEditing(id);
    setDialogOpen(true);
  };

  const save = () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    if (form.team && isNaN(Number(form.team))) {
      setError("Team harus berupa angka");
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
      name: form.name.trim().toUpperCase(),
      email: normalizedEmail || undefined,
      isAdmin: !!form.isAdmin,
    };

    const doSave = async () => {
      try {
        const { id, ...data } = prepared;
        if (editing) {
          await setDoc(doc(db, "members", id), data);
          setMembers((prev) => prev.map((m) => (m.id === editing ? prepared : m)));
        } else {
          const ref = await addDoc(collection(db, "members"), data);
          setMembers((prev) => [...prev, { ...prepared, id: ref.id }]);
        }
        setDialogOpen(false);
      } catch (e: any) {
        setError(`Gagal menyimpan ke Firestore: ${e?.message || "server error"}`);
      }
    };
    void doSave();
  };

  const remove = (id: string) => {
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manage Members</CardTitle>
              <CardDescription>Input data member — Nama Lengkap, NIJ, Email, Nickname, Team, Role, Admin, Source User</CardDescription>
            </div>
            <Button onClick={openAddDialog}>Tambah</Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-3 mb-4">
            <Input
              placeholder="Cari nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={teamFilter} onValueChange={(val) => setTeamFilter(val ?? "all")} items={{ all: "Semua Team", ...teamItems }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Semua Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Team</SelectItem>
                {distinctTeams.map((t) => (
                  <SelectItem key={t} value={t}>Team {t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {filteredMembers.map((m) => (
                <div key={m.id} className="p-2 border rounded flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name.toUpperCase()} {m.team ? `(Team ${m.team})` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      NIJ: {m.nij ?? "-"} · {m.email || "-"} · {m.role} {m.isAdmin ? "· ADMIN" : ""}
                      {m.sourceId != null && ` · Source: ${m.sourceId}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(m.id)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(m.id)}>Hapus</Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange} disablePointerDismissal>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Member" : "Tambah Member"}</DialogTitle>
            <DialogDescription>
              {editing ? "Ubah data anggota" : "Isi data anggota baru"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input placeholder="Nama Lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="uppercase" />
            <Input placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <Input placeholder="Team" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
            <Input placeholder="NIJ (angka)" value={form.nij ?? ""} onChange={(e) => setForm({ ...form, nij: e.target.value ? Number(e.target.value) : undefined })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Source User</label>
            <ReactSelect<SelectOption, false>
              options={userOptions}
              value={selectedSourceUser}
              onChange={(opt: SelectOption | null) => {
                if (!opt) {
                  setForm({ ...form, sourceId: undefined });
                  return;
                }
                const user = allUsers.find((u) => String(u.id) === opt.value);
                const fullName = user?.fullName.toUpperCase() ?? form.name;
                setForm({
                  ...form,
                  sourceId: Number(opt.value),
                  name: fullName,
                  email: user?.email ?? form.email,
                });
              }}
              placeholder={usersLoading ? "Memuat users..." : "Pilih source user..."}
              isDisabled={usersLoading}
              isClearable
              styles={{
                control: (base: any, state: any) => ({
                  ...base,
                  minHeight: "2.25rem",
                  borderRadius: "var(--radius-md)",
                  borderColor: state.isFocused ? "var(--ring)" : "var(--input)",
                  boxShadow: state.isFocused
                    ? `0 0 0 3px color-mix(in oklch, var(--ring) 20%, transparent)`
                    : "none",
                  backgroundColor: "var(--background)",
                  "&:hover": { borderColor: "var(--ring)" },
                  fontSize: "0.875rem",
                  lineHeight: "1.25rem",
                  cursor: "pointer",
                }),
                valueContainer: (base: any) => ({ ...base, padding: "0.25rem 0.5rem" }),
                input: (base: any) => ({ ...base, color: "var(--foreground)", margin: 0, padding: 0 }),
                placeholder: (base: any) => ({ ...base, color: "var(--muted-foreground)" }),
                menu: (base: any) => ({
                  ...base,
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  overflow: "hidden",
                  zIndex: 50,
                }),
                menuList: (base: any) => ({ ...base, padding: "0.25rem" }),
                option: (base: any, state: any) => ({
                  ...base,
                  borderRadius: "calc(var(--radius-md) - 2px)",
                  padding: "0.375rem 0.5rem",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  backgroundColor: state.isSelected || state.isFocused ? "var(--accent)" : "transparent",
                  color: state.isSelected ? "var(--accent-foreground)" : "var(--popover-foreground)",
                }),
                indicatorSeparator: () => ({ display: "none" }),
                dropdownIndicator: (base: any, state: any) => ({
                  ...base,
                  color: "var(--muted-foreground)",
                  padding: "0.25rem",
                  transition: "transform 200ms",
                  transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  "&:hover": { color: "var(--foreground)" },
                }),
                clearIndicator: (base: any) => ({
                  ...base,
                  color: "var(--muted-foreground)",
                  padding: "0.25rem",
                  "&:hover": { color: "var(--foreground)" },
                }),
                noOptionsMessage: (base: any) => ({
                  ...base,
                  color: "var(--muted-foreground)",
                  fontSize: "0.875rem",
                  padding: "0.5rem",
                }),
                singleValue: (base: any) => ({
                  ...base,
                  color: "var(--foreground)",
                }),
              }}
            />
            {usersError && (
              <p className="text-sm text-destructive mt-2">⚠ {usersError}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm">Role</label>
            <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val as MemberForm["role"] })}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Member">Member</SelectItem>
                <SelectItem value="SPV">SPV</SelectItem>
                <SelectItem value="PIC">PIC</SelectItem>
              </SelectContent>
            </Select>
            <label className="ml-4 text-sm flex items-center gap-2">
              <input type="checkbox" checked={!!form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
              <span>Admin</span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive">⚠ {error}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Batal
            </DialogClose>
            <Button onClick={save}>{editing ? "Update" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MembersPage() {
  return (
    <WebAuthGuard>
      <MembersContent />
    </WebAuthGuard>
  );
}
