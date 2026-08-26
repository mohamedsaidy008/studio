/**
 * دالة برمجية صارمة لتحويل روابط يوتيوب إلى روابط Embed صالحة للـ iFrame.
 */
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  
  try {
    let videoId = "";
    
    if (url.includes("v=")) {
      videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1].split("?")[0];
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : url;
  } catch (error) {
    console.error("Error parsing YouTube URL:", error);
    return url;
  }
}