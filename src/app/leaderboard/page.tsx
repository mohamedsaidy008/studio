'use client';

import { useEffect, useState, useMemo } from "react";
import { useFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, getDocs, startAfter, where } from "firebase/firestore";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Search, ChevronDown, Loader2, Globe, MapPin } from "lucide-react";
import { getCountryDisplayName, ARAB_COUNTRIES } from "@/lib/countries";
import { calculateLevel } from "@/app/profile/[uid]/page";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const SUPER_ADMIN_EMAIL = 'artiateech@gmail.com';

export default function LeaderboardPage() {
  const { db } = useFirebase();
  const { user: currentUser } = useUser();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL");

  useEffect(() => {
    document.title = "الترتيب";
  }, []);

  const fetchLeaders = async (isMore = false, country = countryFilter) => {
    if (!db) return;
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      let q;
      if (country === "ALL") {
        q = query(
          collection(db, "users"),
          where("xp", ">", 0),
          orderBy("xp", "desc"),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, "users"),
          where("country", "==", country),
          where("xp", ">", 0),
          orderBy("xp", "desc"),
          limit(PAGE_SIZE)
        );
      }

      if (isMore && lastDoc) {
        if (country === "ALL") {
          q = query(collection(db, "users"), where("xp", ">", 0), orderBy("xp", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
        } else {
          q = query(collection(db, "users"), where("country", "==", country), where("xp", ">", 0), orderBy("xp", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
        }
      }

      const snapshot = await getDocs(q);
      const list = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter((u: any) => u.email !== SUPER_ADMIN_EMAIL);

      if (isMore) {
        setLeaders(prev => [...prev, ...list]);
      } else {
        setLeaders(list);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error("Leaderboard error:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLeaders(false, countryFilter);
  }, [db, countryFilter]);

  const filteredLeaders = useMemo(() => {
    if (!searchTerm) return leaders;
    return leaders.filter(l => 
      l.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leaders, searchTerm]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <Trophy className="w-8 h-8 text-orange-500" />
             <h1 className="text-2xl font-bold">الترتيب العام</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="بحث عن مبرمج..." 
                className="pr-10 h-10 rounded-sm bg-white border-slate-200" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full sm:w-48 h-10 rounded-sm bg-white font-bold border-slate-200">
                <div className="flex items-center gap-2">
                  {countryFilter === "ALL" ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                <SelectItem value="ALL" className="text-right font-bold">تصنيف دولي (الكل)</SelectItem>
                {ARAB_COUNTRIES.map(c => (
                  <SelectItem key={c.code} value={c.code} className="text-right">
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white border rounded-sm overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-6 py-4 text-slate-500 text-[10px] uppercase font-black">#</th>
                <th className="px-6 py-4 text-slate-500 text-[10px] uppercase font-black text-right">المبرمج</th>
                <th className="px-6 py-4 text-slate-500 text-[10px] uppercase font-black text-center">الرتبة</th>
                <th className="px-6 py-4 text-slate-500 text-[10px] uppercase font-black text-center">الدولة</th>
                <th className="px-6 py-4 text-slate-500 text-[10px] uppercase font-black text-center">المسائل</th>
                <th className="px-6 py-4 text-slate-500 text-[10px] uppercase font-black text-center">XP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaders.map((leader, idx) => {
                const { rank, color: rankColor } = calculateLevel(leader.xp || 0);
                return (
                  <tr key={leader.uid} className={`border-b hover:bg-slate-50 transition-colors ${leader.uid === currentUser?.uid ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-4 font-bold text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <Link href={`/profile/${leader.uid}`} className="flex flex-col group text-right">
                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{leader.username}</span>
                        <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{leader.cfHandle || 'No Handle'}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={cn("text-[9px] font-black rounded-sm px-2", rankColor)}>{rank}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="text-[10px] font-bold rounded-sm bg-slate-100">
                        {getCountryDisplayName(leader.country || "LY")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700 text-xs">{leader.solved || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-primary text-xs">{leader.xp || 0}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredLeaders.length === 0 && !loading && (
            <div className="py-20 text-center flex flex-col items-center gap-3">
               <Trophy className="w-12 h-12 text-slate-100" />
               <p className="text-slate-400 font-bold text-sm">لا يوجد مبرمجون نشطون في هذا القسم حالياً.</p>
            </div>
          )}
          
          {hasMore && !searchTerm && filteredLeaders.length > 0 && (
            <div className="p-4 text-center border-t bg-slate-50/50">
              <Button 
                variant="ghost" 
                onClick={() => fetchLeaders(true)} 
                disabled={loadingMore}
                className="font-bold text-[10px] h-8"
              >
                {loadingMore ? <Loader2 className="animate-spin w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                تحميل المزيد
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
