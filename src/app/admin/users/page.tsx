'use client';

import { useState, useEffect, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { useAdmin, useFirebase } from "@/firebase";
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc as firestoreDoc 
} from "firebase/firestore";
import { ref, update as updateRtdb } from "firebase/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, UserCog, Loader2, ShieldAlert, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const SUPER_ADMINS = ['artiateech@gmail.com', 'artiatechstudio@gmail.com'];

export default function UsersManagementPage() {
  const { isAdmin, role, loading: adminLoading } = useAdmin();
  const { db, rtdb } = useFirebase();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push("/admin/problems");
    }
  }, [isAdmin, adminLoading, router]);

  useEffect(() => {
    if (!db || !isAdmin) return;

    const usersCol = collection(db, "users");
    const unsub = onSnapshot(usersCol, (snap) => {
      const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(list);
      setLoading(false);
    });

    return () => unsub();
  }, [db, isAdmin]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      u.username?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term) ||
      u.uid?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const toggleRole = async (uid: string, currentRole: string, targetRole: 'admin' | 'problem_setter' | 'trainee', email: string) => {
    if (!isAdmin) return;
    if (SUPER_ADMINS.includes(email)) return;
    
    if (currentRole === 'admin' || targetRole === 'admin') {
      return; 
    }
    
    try {
      await updateDoc(firestoreDoc(db!, `users/${uid}`), { role: targetRole });
      await updateRtdb(ref(rtdb!, `users/${uid}`), { role: targetRole });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen bg-background text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-sm border border-primary/20"><Users className="w-8 h-8 text-primary" /></div>
              <div>
                <h1 className="text-3xl font-black">إدارة الأعضاء</h1>
                <p className="text-muted-foreground font-bold text-sm">متابعة مبرمجي المنصة وصلاحياتهم الإدارية.</p>
              </div>
            </div>
            
            <div className="relative w-full md:w-80">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <Input 
                  placeholder="بحث بالاسم أو البريد..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-11 bg-white border-2 focus:border-primary rounded-sm font-bold"
               />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 p-4 rounded-sm flex items-center gap-3 text-orange-700 text-[11px] font-black">
             <ShieldAlert className="w-5 h-5 shrink-0" />
             <p>حماية النظام: لا يمكن تعديل رتب الحسابات الإدارية الأساسية التابعة لـ Artiatech Studio.</p>
          </div>

          <Card className="rounded-sm border shadow-none overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-[10px] font-black flex items-center justify-end gap-2 text-slate-500 uppercase tracking-widest">
                قائمة المسجلين ({filteredUsers.length} مبرمج)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/30">
                      <TableHead className="text-right font-black text-[10px] uppercase tracking-wider">المستخدم</TableHead>
                      <TableHead className="text-right font-black text-[10px] uppercase tracking-wider">البريد الإلكتروني</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase tracking-wider">النقاط (XP)</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase tracking-wider">الرتبة</TableHead>
                      <TableHead className="text-left font-black text-[10px] uppercase tracking-wider">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const isSuper = SUPER_ADMINS.includes(u.email || '');
                      const isTargetAdmin = u.role === 'admin';
                      return (
                        <TableRow key={u.uid} className={cn("hover:bg-slate-50 transition-colors", isSuper ? "bg-primary/5" : "")}>
                          <TableCell className="font-bold">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-800">{u.username}</span>
                              <span className="text-[9px] text-slate-400 font-mono" dir="ltr">{u.uid}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs text-slate-600">{u.email}</TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="font-black text-[10px] bg-white border-primary/20 text-primary">{u.xp || 0} XP</Badge></TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn(
                              "text-[10px] font-black rounded-sm px-3",
                              u.role === 'admin' ? 'bg-red-600 text-white' : 
                              u.role === 'problem_setter' ? 'bg-blue-600 text-white' : 
                              'bg-slate-200 text-slate-800'
                            )}>
                              {u.role === 'admin' ? 'مدير' : u.role === 'problem_setter' ? 'واضع مسائل' : 'متدرب'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleRole(u.uid, u.role, u.role === 'problem_setter' ? 'trainee' : 'problem_setter', u.email)}
                                disabled={isSuper || isTargetAdmin}
                                className="text-[9px] h-8 font-black border-slate-200 hover:bg-slate-50 rounded-sm"
                              >
                                {u.role === 'problem_setter' ? "سحب صلاحيات الوضع" : "منح صلاحيات الوضع"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-24 text-center text-slate-400 font-bold italic">
                           لا توجد نتائج مطابقة لعملية البحث.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
