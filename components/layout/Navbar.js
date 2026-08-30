"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ShoppingBag, Search, User, Menu, X,
  ArrowUpRight, ChevronDown, LogOut, Package, Settings, ArrowRight,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { shouldUnoptimizeImage } from "@/lib/utils";
import { track } from "@/lib/tracking/client";
import { isStaff } from "@/lib/permissions";
import Wordmark from "@/components/brand/Wordmark";

let _navCache = null;
let _navCacheTs = 0;

// Shown in the ticker until the admin sets an announcement of their own.
const DEFAULT_TICKER = [
  "Free delivery over Tk 1500",
  "Cash on delivery nationwide",
  "New drops every Thursday",
  "7-day easy exchange",
];

// ─── Ticker ───────────────────────────────────────────────────────────────────

function Ticker({ text, link }) {
  const messages = text ? [text] : DEFAULT_TICKER;
  const run = [...messages, ...messages, ...messages, ...messages];

  const strip = (
    <div className="marquee-track animate-marquee-slow">
      {[0, 1].map((copy) => (
        <div key={copy} className="flex items-center shrink-0">
          {run.map((m, i) => (
            <span key={`${copy}-${i}`} className="flex items-center shrink-0">
              <span className="text-[12.5px] font-medium px-5 whitespace-nowrap">{m}</span>
              <span className="w-1 h-1 rounded-full bg-ink/25 shrink-0" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-9 bg-beam text-ink overflow-hidden flex items-center pause-on-hover">
      {link ? <Link href={link} className="w-full">{strip}</Link> : strip}
    </div>
  );
}

// ─── Desktop nav ──────────────────────────────────────────────────────────────

function NavLink({ item, isOpen, onOpen, onClose }) {
  const hasChildren = item.children?.length > 0;

  return (
    <div className="relative" onMouseEnter={() => (hasChildren ? onOpen(item._id) : onClose())}>
      <Link
        href={item.href}
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[14.5px] font-medium tracking-[-0.01em] whitespace-nowrap transition-colors duration-200 ${
          item.highlighted
            ? "text-signal hover:bg-signal-soft"
            : isOpen
            ? "bg-haze text-ink"
            : "text-ink/70 hover:text-ink hover:bg-haze"
        }`}
      >
        {item.label}
        {hasChildren && (
          <ChevronDown
            size={14}
            strokeWidth={2.2}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </Link>
    </div>
  );
}

function MegaPanel({ item, onClose }) {
  const columns = item.children || [];

  return (
    <div
      className="hidden lg:block absolute left-0 right-0 top-full pt-3 animate-fade-in"
      onMouseLeave={onClose}
    >
      <div className="container-custom">
        <div className="rounded-4xl bg-paper-pure shadow-pop p-8 overflow-hidden">
          <div className="flex items-start gap-10">
            <div className="w-[190px] shrink-0">
              <span className="eyebrow-beam">{item.label}</span>
              <p className="text-[15px] text-smoke leading-relaxed mt-4">
                {columns.length} line{columns.length === 1 ? "" : "s"} in this collection.
              </p>
              <Link
                href={item.href}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 mt-5 text-[14px] font-semibold text-ink hover:text-signal transition-colors"
              >
                Shop all
                <span className="w-6 h-6 rounded-full bg-beam flex items-center justify-center">
                  <ArrowUpRight size={13} strokeWidth={2.4} className="text-ink" />
                </span>
              </Link>
            </div>

            <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-7">
              {columns.map((child) => (
                <div key={child._id}>
                  <Link
                    href={child.href}
                    onClick={onClose}
                    className="block text-[15px] font-semibold text-ink hover:text-signal transition-colors"
                  >
                    {child.name}
                  </Link>
                  {child.children?.length > 0 && (
                    <ul className="mt-2.5 space-y-2">
                      {child.children.map((gc) => (
                        <li key={gc._id}>
                          <Link
                            href={gc.href}
                            onClick={onClose}
                            className="text-[14px] text-smoke hover:text-ink transition-colors"
                          >
                            {gc.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile drawer item ───────────────────────────────────────────────────────

function MobileNavItem({ item, onClose }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children?.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`block rounded-2xl px-4 py-3.5 text-[19px] font-semibold tracking-[-0.02em] ${
          item.highlighted ? "text-signal" : "text-ink"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full rounded-2xl px-4 py-3.5 text-left"
      >
        <span
          className={`text-[19px] font-semibold tracking-[-0.02em] ${
            item.highlighted ? "text-signal" : "text-ink"
          }`}
        >
          {item.label}
        </span>
        <span
          className={`w-8 h-8 rounded-full bg-haze flex items-center justify-center text-ink transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={15} strokeWidth={2.2} />
        </span>
      </button>

      {open && (
        <div className="pb-2 pl-4 animate-fade-in">
          <Link
            href={item.href}
            onClick={onClose}
            className="block py-2 text-[15px] font-medium text-signal"
          >
            All {item.label}
          </Link>
          {item.children.map((child) => (
            <div key={child._id}>
              <Link
                href={child.href}
                onClick={onClose}
                className="block py-2 text-[15px] text-ink/75 hover:text-ink transition-colors"
              >
                {child.name}
              </Link>
              {child.children?.length > 0 && (
                <div className="pl-4">
                  {child.children.map((gc) => (
                    <Link
                      key={gc._id}
                      href={gc.href}
                      onClick={onClose}
                      className="block py-1.5 text-[14px] text-smoke hover:text-ink transition-colors"
                    >
                      {gc.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Full-screen search ───────────────────────────────────────────────────────

function SearchOverlay({ open, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const timer = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return undefined; }
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer.current);
  }, [query]);

  const submit = (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    track.search({ customData: { search_string: q } });
    router.push(`/shop?search=${encodeURIComponent(q)}`);
    onClose();
  };

  if (!open) return null;
  const q = query.trim();

  return (
    <div className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="container-custom py-5 md:py-8">
        <div className="rounded-4xl bg-paper-pure shadow-pop overflow-hidden">
          <form onSubmit={submit} className="flex items-center gap-4 px-6 md:px-8 py-5 border-b border-haze-dark">
            <Search size={22} strokeWidth={2} className="text-smoke shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a piece…"
              className="flex-1 min-w-0 bg-transparent text-[20px] md:text-[26px] font-medium tracking-[-0.02em] text-ink placeholder-smoke-light focus:outline-none py-1"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="w-10 h-10 rounded-full bg-haze hover:bg-haze-dark flex items-center justify-center text-ink transition-colors shrink-0"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </form>

          <div className="p-6 md:p-8">
            {q.length < 2 ? (
              <>
                <p className="text-[13px] font-semibold text-smoke mb-4">Popular right now</p>
                <div className="flex flex-wrap gap-2">
                  {["New arrivals", "On sale", "Shirts", "Denim", "Outerwear", "Accessories"].map((t) => (
                    <button key={t} onClick={() => setQuery(t)} className="chip">
                      {t}
                    </button>
                  ))}
                </div>
              </>
            ) : loading ? (
              <p className="text-[15px] text-smoke">Searching…</p>
            ) : results.length === 0 ? (
              <p className="text-[15px] text-smoke">Nothing matches that search.</p>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-smoke mb-3">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1">
                  {results.map((product) => (
                    <Link
                      key={product._id}
                      href={`/shop/${product.slug}`}
                      onClick={onClose}
                      className="group flex items-center gap-4 rounded-2xl p-2 hover:bg-haze transition-colors"
                    >
                      <div className="w-14 h-16 rounded-2xl bg-haze shrink-0 overflow-hidden">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <p className="flex-1 min-w-0 text-[15.5px] font-medium text-ink truncate">
                        {product.name}
                      </p>
                      <span className="text-[15px] font-semibold text-ink tabular-nums shrink-0">
                        Tk {product.price.toLocaleString()}
                      </span>
                      <span className="w-9 h-9 rounded-full bg-haze group-hover:bg-beam flex items-center justify-center transition-colors shrink-0">
                        <ArrowRight size={15} strokeWidth={2.2} className="text-ink" />
                      </span>
                    </Link>
                  ))}
                </div>
                <button onClick={submit} className="btn-outline mt-6 w-full sm:w-auto">
                  See every result
                  <ArrowUpRight size={16} strokeWidth={2.2} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const { itemCount, openDrawer } = useCart();
  const { data: session } = useSession();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [navItems, setNavItems] = useState([]);
  const [announcement, setAnnouncement] = useState({ enabled: true, text: "", link: "" });

  const accountRef = useRef(null);

  useEffect(() => {
    const now = Date.now();
    if (_navCache && now - _navCacheTs < 60_000) {
      setNavItems(_navCache.navItems || []);
      setAnnouncement(_navCache.announcement || { enabled: true, text: "", link: "" });
      return;
    }
    fetch("/api/nav")
      .then((r) => r.json())
      .then((data) => {
        _navCache = data;
        _navCacheTs = Date.now();
        setNavItems(data.navItems || []);
        setAnnouncement(data.announcement || { enabled: true, text: "", link: "" });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Keep --header-h honest so every sticky panel below lines up with the bar.
  useEffect(() => {
    document.documentElement.dataset.ticker = announcement.enabled ? "on" : "off";
  }, [announcement.enabled]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const activeItem = navItems.find((i) => i._id === openMenu);
  const showTicker = announcement.enabled;

  const iconBtn =
    "w-10 h-10 rounded-full flex items-center justify-center text-ink hover:bg-haze transition-colors";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40" onMouseLeave={closeMenu}>
        {showTicker && <Ticker text={announcement.text} link={announcement.link} />}

        <div
          className={`relative transition-all duration-300 ${
            scrolled
              ? "bg-paper/85 backdrop-blur-xl shadow-soft"
              : "bg-paper/60 backdrop-blur-md"
          }`}
        >
          <div className="container-custom">
            <div className="flex items-center h-16">

              <div className="flex items-center gap-1 shrink-0">
                <button
                  className={`lg:hidden -ml-2 ${iconBtn}`}
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu size={21} strokeWidth={2} />
                </button>
                <Link href="/" aria-label="Orvo home" className="block">
                  <Wordmark size="sm" className="lg:hidden" />
                  <Wordmark size="md" className="hidden lg:inline-flex" />
                </Link>
              </div>

              <nav className="hidden lg:flex items-center gap-0.5 ml-10 flex-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item._id}
                    item={item}
                    isOpen={openMenu === item._id}
                    onOpen={setOpenMenu}
                    onClose={closeMenu}
                  />
                ))}
              </nav>

              <div className="flex items-center gap-1 ml-auto lg:ml-0 shrink-0">
                <button className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="Search">
                  <Search size={20} strokeWidth={2} />
                </button>

                <div className="relative" ref={accountRef}>
                  <button
                    className={iconBtn}
                    onClick={() => setAccountOpen((v) => !v)}
                    aria-label="Account"
                  >
                    {session?.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={30}
                        height={30}
                        unoptimized={shouldUnoptimizeImage(session.user.image)}
                        className="w-[30px] h-[30px] rounded-full object-cover"
                      />
                    ) : (
                      <User size={20} strokeWidth={2} />
                    )}
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 top-full mt-3 w-72 rounded-3xl bg-paper-pure shadow-pop overflow-hidden z-50 animate-fade-in">
                      {session ? (
                        <>
                          <div className="px-5 py-4 bg-haze">
                            <p className="text-[16px] font-semibold text-ink truncate">
                              {session.user.name}
                            </p>
                            <p className="text-[13px] text-smoke truncate">{session.user.email}</p>
                          </div>
                          <div className="p-2">
                            {[
                              { href: "/account", label: "Profile", Icon: User },
                              { href: "/account/orders", label: "Orders", Icon: Package },
                            ].map(({ href, label, Icon }) => (
                              <Link
                                key={href}
                                href={href}
                                onClick={() => setAccountOpen(false)}
                                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[14.5px] text-ink hover:bg-haze transition-colors"
                              >
                                <Icon size={17} strokeWidth={2} className="text-smoke" /> {label}
                              </Link>
                            ))}
                            {isStaff(session.user.role) && (
                              <Link
                                href="/admin"
                                onClick={() => setAccountOpen(false)}
                                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[14.5px] font-medium text-signal hover:bg-signal-soft transition-colors"
                              >
                                <Settings size={17} strokeWidth={2} /> Admin panel
                              </Link>
                            )}
                            <button
                              onClick={() => { signOut({ callbackUrl: "/" }); setAccountOpen(false); }}
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[14.5px] text-smoke hover:bg-haze hover:text-ink transition-colors"
                            >
                              <LogOut size={17} strokeWidth={2} /> Sign out
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-5">
                          <p className="text-[14px] text-smoke leading-relaxed mb-4">
                            Sign in to track orders and check out faster.
                          </p>
                          <Link
                            href="/auth/login"
                            onClick={() => setAccountOpen(false)}
                            className="btn-primary w-full"
                          >
                            Sign in
                          </Link>
                          <Link
                            href="/auth/register"
                            onClick={() => setAccountOpen(false)}
                            className="block text-center mt-3 text-[14px] font-medium text-smoke hover:text-ink transition-colors"
                          >
                            Create an account
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={openDrawer}
                  aria-label="Cart"
                  className="relative ml-1 h-10 pl-4 pr-4 rounded-full bg-ink text-paper-pure flex items-center gap-2 hover:bg-ink-soft transition-colors"
                >
                  <ShoppingBag size={17} strokeWidth={2} />
                  <span className="text-[14px] font-semibold tabular-nums leading-none">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-beam ring-2 ring-paper" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {activeItem?.children?.length > 0 && <MegaPanel item={activeItem} onClose={closeMenu} />}
        </div>
      </header>

      {/* Flow spacer — keeps the header's real height out of every page's markup */}
      <div aria-hidden className="h-[var(--header-h)]" />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={closeMobile}
        />
      )}

      <div
        className={`fixed inset-y-3 right-3 z-[70] w-[88%] max-w-[380px] rounded-4xl bg-paper-pure shadow-pop lg:hidden flex flex-col overflow-hidden transform transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 shrink-0">
          <Link href="/" onClick={closeMobile}>
            <Wordmark size="sm" />
          </Link>
          <button onClick={closeMobile} className={`-mr-1 ${iconBtn}`} aria-label="Close menu">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-8">
          <nav>
            {navItems.map((item) => (
              <MobileNavItem key={item._id} item={item} onClose={closeMobile} />
            ))}
          </nav>

          <div className="mt-6 px-1">
            {session ? (
              <div className="rounded-3xl bg-haze p-4">
                <p className="text-[16px] font-semibold text-ink mb-3">{session.user.name}</p>
                <Link href="/account" onClick={closeMobile} className="flex items-center gap-3 py-2.5 text-[15px] text-ink">
                  <User size={17} strokeWidth={2} className="text-smoke" /> Profile
                </Link>
                <Link href="/account/orders" onClick={closeMobile} className="flex items-center gap-3 py-2.5 text-[15px] text-ink">
                  <Package size={17} strokeWidth={2} className="text-smoke" /> Orders
                </Link>
                {isStaff(session.user.role) && (
                  <Link href="/admin" onClick={closeMobile} className="flex items-center gap-3 py-2.5 text-[15px] font-medium text-signal">
                    <Settings size={17} strokeWidth={2} /> Admin panel
                  </Link>
                )}
                <button
                  onClick={() => { signOut({ callbackUrl: "/" }); closeMobile(); }}
                  className="flex items-center gap-3 py-2.5 text-[15px] text-smoke w-full text-left"
                >
                  <LogOut size={17} strokeWidth={2} /> Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Link href="/auth/login" onClick={closeMobile} className="btn-primary">
                  Sign in
                </Link>
                <Link href="/auth/register" onClick={closeMobile} className="btn-outline">
                  Create an account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
