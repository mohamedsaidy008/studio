'use client';

import { useEffect, useState } from "react";
import { useFirebase, useUser } from "@/firebase";
import { ref, onValue, off } from "firebase/database";
import { collection, query, orderBy, limit, getDocs, startAfter } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, CheckCircle2, ChevronDown, Database, Trophy, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getUpcomingContests } from "@/app/actions/codeforces";

const PAGE_SIZE = 25;

export default function ProblemsPage() {
  const { db, rtdb } = useFirebase();
  const { user } = useUser();
  
  const [problems, setProblems] = useState<any[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [contests, setContests] = useState<any[]>([]);
  const [loadingContests, setLoadingContests] = useState(false);

  useEffect(() => {
    document.title = "المسائل";
    fetchProblems();
    fetchContests();
    
    let progressRef: any = null;
    if (user && rtdb) {
      progressRef = ref(rtdb, `users/${user.uid}/solvedProblems`);
      onValue(progressRef, (snap) => {
        setSolvedProblems(snap.val() || {});
      }, (err) => console.error("Solved problems sync error:", err));
    }

    return () => {
      if (progressRef) off(progressRef);
    };
  }, [db, rtdb, user]);

  const fetchProblems = async (isMore = false) => {
    if (!db) return;
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      let q = query(
        collection(db, "problems"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (isMore && lastDoc) {
        q = query(collection(db, "problems"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (isMore) setProblems(prev => [...prev, ...list]);
      else setProblems(list);

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error("Firestore fetch error:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchContests = async () => {
    setLoadingContests(true);
    try {
      const upcoming = await getUpcomingContests();
      setContests(upcoming);
    } catch (e) {
      console.error("Failed to load contests:", e);
    } finally {
      setLoadingContests(false);
    }
  };

  const filteredProblems = problems.filter(p => 
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center border-b pb-6">
             <h1 className="text-3xl font-black flex items-center gap-3">بنك المسائل <Database className="w-8 h-8 text-primary" /></h1>
          </div>

          <Tabs defaultValue="problems" className="w-full">
            <TabsList className="bg-white border rounded-md p-1 h-12 mb-8">
              <TabsTrigger value="problems" className="px-8 font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Database className="w-4 h-4" /> المسائل البرمجية
              </TabsTrigger>
              <TabsTrigger value="contests" className="px-8 font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Trophy className="w-4 h-4" /> المسابقات القادمة
              </TabsTrigger>
            </TabsList>

            <TabsContent value="problems" className="space-y-6">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  className="pr-12 h-12 bg-white rounded-md border shadow-sm text-sm" 
                  placeholder="ابحث عن مسألة أو تصنيف..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Card className="rounded-md shadow-none border overflow-hidden bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="px-6 py-4 text-slate-500 text-xs font-bold text-right uppercase">الحالة</th>
                      <th className="px-6 py-4 text-slate-500 text-xs font-bold text-right uppercase">المسألة</th>
                      <th className="px-6 py-4 text-slate-500 text-xs font-bold text-right uppercase">التصنيف</th>
                      <th className="px-6 py-4 text-slate-500 text-xs font-bold text-right uppercase">التقييم (Rating)</th>
                      <th className="px-6 py-4 text-slate-500 text-xs font-bold text-left uppercase">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProblems.map((prob) => (
                      <tr key={prob.id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          {solvedProblems[prob.id] ? (
                            <div className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> محلولة
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800 text-sm">{prob.title}</td>
                        <td className="px-6 py-4"><Badge variant="outline" className="font-bold text-[10px] rounded-sm bg-slate-100">{prob.category}</Badge></td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "font-black text-xs px-2 py-1 rounded-sm",
                            prob.rating >= 2100 ? "text-red-600 bg-red-50" : 
                            prob.rating >= 1600 ? "text-orange-600 bg-orange-50" : 
                            prob.rating >= 1200 ? "text-blue-600 bg-blue-50" : 
                            "text-emerald-600 bg-emerald-50"
                          )}>
                            {prob.rating || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <Link href={`/problems/${prob.id}`}>
                            <Button variant="outline" size="sm" className="font-bold h-8 text-[11px] rounded-sm">فتح المسألة</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMore && !searchTerm && (
                  <div className="p-4 text-center border-t bg-slate-50/30">
                    <Button variant="ghost" onClick={() => fetchProblems(true)} disabled={loadingMore} className="text-xs font-bold text-slate-500">
                      {loadingMore ? <Loader2 className="animate-spin w-3 h-3 ml-2" /> : <ChevronDown className="w-3 h-3 ml-2" />}
                      تحميل المزيد من المسائل
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="contests" className="space-y-6">
              {loadingContests ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin text-primary mx-auto w-10 h-10" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contests.map((contest) => (
                    <Card key={contest.id} className="rounded-md border-r-4 border-r-primary overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-black text-lg text-slate-900 leading-tight flex-1">{contest.name}</h3>
                          <Badge variant="outline" className="font-bold text-[10px] mr-2">#{contest.id}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase">
                              <Calendar className="w-3 h-3" /> موعد البدء
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {format(new Date(contest.startTimeSeconds * 1000), "eeee, d MMMM yyyy", { locale: ar })}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase">
                              <Calendar className="w-3 h-3" /> الساعة
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {format(new Date(contest.startTimeSeconds * 1000), "hh:mm a")}
                            </span>
                          </div>
                        </div>
                        <div className="pt-4">
                          <a 
                            href={`https://codeforces.com/contestRegistration/${contest.id}`} 
                            target="_blank" 
                            className="w-full flex"
                          >
                            <Button className="w-full bg-primary font-black gap-2 h-11 rounded-sm">
                              <ExternalLink className="w-4 h-4" /> التسجيل في المسابقة
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {contests.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 font-bold italic">
                      لا توجد مسابقات قادمة حالياً في قائمة كودفورسز الرسمية.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
