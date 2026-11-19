import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountNav from "@/components/account/AccountNav";

// A shopper's own account and orders: not for search results.
export const metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function AccountLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login?callbackUrl=/account");

  const initials = session.user.name
    ?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-paper py-10">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
          <aside className="lg:col-span-1">
            <AccountNav
              name={session.user.name}
              email={session.user.email}
              initials={initials}
              image={session.user.image || null}
            />
          </aside>
          <main className="lg:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
