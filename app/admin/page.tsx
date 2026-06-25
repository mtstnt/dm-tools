"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Menu</CardTitle>
          <CardDescription>Halaman admin — saat ini terbuka untuk semua user (akan dibatasi ke admin nanti)</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Konten admin akan ditempatkan di sini. Akses akan dibatasi ke pengguna yang ditandai sebagai admin.</p>
        </CardContent>
      </Card>
    </div>
  );
}
