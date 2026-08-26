'use server';

/**
 * @fileOverview Server Actions for Codeforces API interactions to bypass CORS and improve reliability.
 * تم تحسين الرؤوس (Headers) لمحاكاة متصفح حقيقي وتجاوز قيود الحماية مع إضافة مهلة زمنية للطلبات.
 */

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://codeforces.com/',
  'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"'
};

// إعدادات الطلب الموحدة مع مهلة زمنية 10 ثوانٍ لمنع تعليق المتصفح
const getFetchOptions = () => ({
  headers: BROWSER_HEADERS,
  signal: AbortSignal.timeout(10000), // يتطلب Node.js 18+
});

export async function getUpcomingContests() {
  try {
    const response = await fetch('https://codeforces.com/api/contest.list?gym=false', {
      ...getFetchOptions(),
      next: { revalidate: 3600 } 
    });
    
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    if (data.status !== 'OK') return [];
    
    return data.result
      .filter((c: any) => c.phase === 'BEFORE')
      .sort((a: any, b: any) => a.startTimeSeconds - b.startTimeSeconds);
  } catch (error) {
    console.error('Error in getUpcomingContests:', error);
    return [];
  }
}

export async function getUserStatus(handle: string) {
  try {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`, {
      ...getFetchOptions(),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return { status: 'FAILED', comment: 'فشل الاتصال المباشر بكودفورسز (HTTP Error)' };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getUserStatus:', error);
    return { status: 'FAILED', comment: 'تعذر الاتصال بخادم كودفورسز حالياً (Timeout)' };
  }
}

export async function getUserInfo(handle: string) {
  try {
    const response = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, {
      ...getFetchOptions(),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('CF API Response Error:', response.status, errorText);
      return { 
        status: 'FAILED', 
        comment: response.status === 403 ? 'تم حظر الطلب مؤقتاً من قبل كودفورسز، يرجى المحاولة لاحقاً.' : 'فشل الوصول لبيانات المستخدم. تأكد من الهاندل.' 
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error in getUserInfo:', error);
    return { 
      status: 'FAILED', 
      comment: 'حدث خطأ غير متوقع أثناء الاتصال بكودفورسز.' 
    };
  }
}

export async function getUserRating(handle: string) {
  try {
    const response = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`, {
      ...getFetchOptions(),
      cache: 'no-store'
    });
    
    if (!response.ok) return { status: 'FAILED' };
    return await response.json();
  } catch (error) {
    console.error('Error in getUserRating:', error);
    return { status: 'FAILED' };
  }
}
