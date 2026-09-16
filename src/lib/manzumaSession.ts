/**
 * مين مسجّل دخول، حسب حسابات المنظومة.
 *
 * التطبيق بينخدم من `cosuite.manzuma.app`، فالكوكي المشترك بيوصل مع الطلب لما
 * نبعت `credentials: "include"`. ما منخزّن ولا توكن هون: الكوكي هو الاعتماد،
 * والسيرفر هو اللي بيتحقق منه.
 */
export type ManzumaOrg = { id: string; name: string; role: string };
export type ManzumaSession = { userId: string; organizations: ManzumaOrg[] };

const ACCOUNTS = process.env.NEXT_PUBLIC_MANZUMA_ACCOUNTS_URL || "https://accounts.manzuma.app";

export async function manzumaSession(): Promise<ManzumaSession | null> {
  try {
    const res = await fetch(`${ACCOUNTS}/api/session`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.authenticated || !data?.user?.id) return null;

    return {
      userId: data.user.id,
      organizations: (data.organizations ?? []).map((org: ManzumaOrg) => ({
        id: org.id,
        name: org.name,
        role: org.role,
      })),
    };
  } catch {
    // الحسابات مش شغّالة أو الرد مش عقدنا. المستخدم بيشوف شاشة الدخول،
    // مش صفحة مكسورة.
    return null;
  }
}
