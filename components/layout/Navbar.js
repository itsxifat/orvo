"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ShoppingBag, Search, User, Menu, X,
  ArrowUpRight, ChevronDown, LogOut, Package, ArrowRight,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { formatPrice, shouldUnoptimizeImage } from "@/lib/utils";
import { track } from "@/lib/tracking/client";
import WasPrice from "@/components/ui/WasPrice";
import Wordmark from "@/components/brand/Wordmark";
import TopStrip from "@/components/layout/TopStrip";

// The menu, the announcement and the shop's name come from the brand ERP
// (GET /storefront/v1/site → lib/storefront.js mapSite), read once per request
// by the root layout and handed down through SettingsContext. Menu entries are
// `category` (its visible subcategories under it, two levels), `dropdown` (its
// own children; no address of its own) or `custom` (a link).

// ─── Desktop nav ──────────────────────────────────────────────────────────────

function NavLink({ item, isOpen, onOpen, onClose }) {
  const hasChildren = item.children?.length > 0;
  const className = `flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[14.5px] font-medium tracking-[-0.01em] transition-colors duration-fast ease-swift ${
    item.highlighted
      ? "text-signal hover:bg-signal-soft"
      : isOpen
      ? "bg-haze text-ink"
      : "text-ink/70 hover:text-ink hover:bg-haze"
  }`;
  const chevron = hasChildren && (
    <ChevronDown
      size={14}
      strokeWidth={2.2}
      aria-hidden
      className={`transition-transform duration-base ease-settle ${isOpen ? "rotate-180" : ""}`}
    />
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => (hasChildren ? onOpen(item._id) : onClose())}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {item.href ? (
        <Link
          href={item.href}
          className={className}
          onFocus={() => (hasChildren ? onOpen(item._id) : onClose())}
          aria-haspopup={hasChildren ? "true" : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
        >
          {item.label}
          {chevron}
        </Link>
      ) : (
        // A dropdown has no page of its own: the label only opens its panel.
        <button
          type="button"
          className={className}
          onClick={() => (isOpen ? onClose() : onOpen(item._id))}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {item.label}
          {chevron}
        </button>
      )}
    </div>
  );
}

function MegaPanel({ item, onClose }) {
  const columns = item.children || [];

  return (
    <div
      className="absolute left-0 right-0 top-full hidden animate-reveal pt-3 lg:block"
      onMouseLeave={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="container-custom">
        <div className="rounded-4xl bg-paper-pure shadow-pop p-8 overflow-hidden">
          <div className="flex items-start gap-10">
            <div className="w-[190px] shrink-0">
              <span className="eyebrow-beam">{item.label}</span>
              <p className="text-[15px] text-smoke leading-relaxed mt-4">
                {columns.length} line{columns.length === 1 ? "" : "s"} in this collection.
              </p>
              {item.href && (
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
              )}
            </div>

            <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-7">
              {columns.map((child) => (
                <div key={child._id}>
                  <Link
                    href={child.href || "/shop"}
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
                            href={gc.href || "/shop"}
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
        href={item.href || "/shop"}
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
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
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
          aria-hidden
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-haze text-ink transition-transform duration-base ease-settle ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={15} strokeWidth={2.2} />
        </span>
      </button>

      {open && (
        <div className="animate-reveal pb-2 pl-4">
          {item.href && (
            <Link
              href={item.href}
              onClick={onClose}
              className="block py-2 text-[15px] font-medium text-signal"
            >
              All {item.label}
            </Link>
          )}
          {item.children.map((child) => (
            <div key={child._id}>
              <Link
                href={child.href || "/shop"}
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
                      href={gc.href || "/shop"}
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

function SearchOverlay({ open, onClose, shortcuts }) {
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

  // Live search: the ERP's search (app/api/search), up to eight products.
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[80] animate-fade-in overflow-y-auto bg-ink/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="container-custom py-4 md:py-8">
        <div
          className="animate-reveal overflow-hidden rounded-4xl bg-paper-pure shadow-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={submit} role="search" className="flex items-center gap-4 px-6 md:px-8 py-5 border-b border-haze-dark">
            <Search size={22} strokeWidth={2} className="text-smoke shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a piece…"
              aria-label="Search products"
              enterKeyHint="search"
              className="flex-1 min-w-0 bg-transparent text-[20px] md:text-[26px] font-medium tracking-[-0.02em] text-ink placeholder-smoke-light focus:outline-none py-1 [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="w-11 h-11 rounded-full bg-haze hover:bg-haze-dark flex items-center justify-center text-ink transition-colors shrink-0"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </form>

          <div className="p-6 md:p-8">
            {q.length < 2 ? (
              shortcuts.length > 0 && (
                <>
                  <p className="text-[13px] font-semibold text-smoke mb-4">Jump to</p>
                  <div className="flex flex-wrap gap-2">
                    {shortcuts.map((s) => (
                      <Link key={s.href} href={s.href} onClick={onClose} className="chip">
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </>
              )
            ) : loading ? (
              <p className="text-[15px] text-smoke" aria-live="polite">Searching…</p>
            ) : results.length === 0 ? (
              <p className="text-[15px] text-smoke" aria-live="polite">Nothing matches that search.</p>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-smoke mb-3" aria-live="polite">
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
                      <div className="relative w-14 h-16 rounded-2xl bg-haze shrink-0 overflow-hidden">
                        {product.image && (
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="56px"
                            unoptimized={shouldUnoptimizeImage(product.image)}
                            className="object-cover"
                          />
                        )}
                      </div>
                      <p className="flex-1 min-w-0 text-[15.5px] font-medium text-ink truncate">
                        {product.name}
                      </p>
                      <span className="flex shrink-0 flex-col items-end leading-tight sm:flex-row sm:items-baseline sm:gap-2">
                        <span className={`text-[15px] font-semibold tabular-nums ${product.compareAt ? "text-signal" : "text-ink"}`}>
                          {formatPrice(product.price)}
                        </span>
                        <WasPrice amount={product.compareAt} className="text-[13px] text-smoke" />
                      </span>
                      <span className="w-9 h-9 rounded-full bg-haze group-hover:bg-beam flex items-center justify-center transition-colors shrink-0">
                        <ArrowRight size={15} strokeWidth={2.2} className="text-ink" />
                      </span>
                    </Link>
                  ))}
                </div>
                <button type="button" onClick={submit} className="btn-outline mt-6 w-full sm:w-auto">
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
  const { settings } = useSettings();
  const navItems = settings?.navItems || [];
  const announcement = settings?.announcement || { enabled: false, text: "", link: "" };
  const siteName = settings?.siteInfo?.siteName || "Orvo";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [stripUp, setStripUp] = useState(false);

  const accountRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setStripUp(y > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setAccountOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
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

  // The strip is always there at the top of the page: the shop's standing
  // promises, or the announcement staff switched on in the ERP. It slides away
  // once the page scrolls. Keep --header-h honest so every sticky panel below
  // lines up with the bar (app/globals.css).
  useEffect(() => {
    document.documentElement.dataset.strip = stripUp ? "up" : "down";
  }, [stripUp]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const activeItem = navItems.find((i) => i._id === openMenu);
  const announced = announcement.enabled && announcement.text ? announcement : null;

  // The search overlay's shortcuts: the shop's own lists, then the top
  // categories of the ERP's menu.
  const shortcuts = [
    { label: "New arrivals", href: "/shop?newArrival=true" },
    { label: "On sale", href: "/shop?onSale=true" },
    ...navItems
      .filter((i) => i.type === "category" && i.href)
      .slice(0, 4)
      .map((i) => ({ label: i.label, href: i.href })),
  ].filter((s, i, all) => all.findIndex((o) => o.href === s.href) === i);

  const iconBtn =
    "press flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors duration-fast ease-swift hover:bg-haze";

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-40 transition-transform duration-slow ease-soft ${
          stripUp ? "-translate-y-12" : "translate-y-0"
        }`}
        onMouseLeave={closeMenu}
      >
        <TopStrip text={announced?.text} link={announced?.link} />

        <div
          className={`relative transition-[background-color,box-shadow,backdrop-filter] duration-slow ease-swift ${
            scrolled
              ? "bg-paper/85 shadow-soft backdrop-blur-xl"
              : "bg-paper/60 backdrop-blur-md"
          }`}
        >
          <div className="container-custom">
            <div className="flex items-center h-16">

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className={`lg:hidden -ml-2.5 ${iconBtn}`}
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                  aria-expanded={mobileOpen}
                >
                  <Menu size={21} strokeWidth={2} />
                </button>
                <Link href="/" aria-label={`${siteName} home`} className="block">
                  <Wordmark size="sm" className="lg:hidden" />
                  <Wordmark size="md" className="hidden lg:inline-flex" />
                </Link>
              </div>

              <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5 ml-10 flex-1">
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

              <div className="flex items-center gap-0.5 ml-auto lg:ml-0 shrink-0">
                <button type="button" className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="Search">
                  <Search size={20} strokeWidth={2} />
                </button>

                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => setAccountOpen((v) => !v)}
                    aria-label="Account"
                    aria-haspopup="true"
                    aria-expanded={accountOpen}
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
                    <div className="absolute right-0 top-full z-50 mt-3 w-72 origin-top-right animate-pop overflow-hidden rounded-3xl bg-paper-pure shadow-pop">
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
                            <button
                              type="button"
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
                  type="button"
                  onClick={openDrawer}
                  aria-label={`Bag, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
                  className="press relative ml-1 flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-paper-pure transition-colors duration-fast ease-swift hover:bg-ink-soft"
                >
                  <ShoppingBag size={17} strokeWidth={2} />
                  <span
                    key={itemCount}
                    aria-hidden
                    className="animate-pop text-[14px] font-semibold leading-none tabular-nums"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                  {itemCount > 0 && (
                    <span aria-hidden className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-beam ring-2 ring-paper" />
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

      <SearchOverlay open={searchOpen} onClose={closeSearch} shortcuts={shortcuts} />

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <div
        aria-hidden
        onClick={closeMobile}
        className={`fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm transition-opacity duration-slow ease-swift lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!mobileOpen}
        inert={mobileOpen ? undefined : ""}
        className={`fixed inset-y-3 right-3 z-[70] flex w-[88%] max-w-[380px] flex-col overflow-hidden rounded-4xl bg-paper-pure shadow-pop transition-transform duration-slow ease-soft lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 shrink-0">
          <Link href="/" onClick={closeMobile} aria-label={`${siteName} home`}>
            <Wordmark size="sm" />
          </Link>
          <button type="button" onClick={closeMobile} className={`-mr-1 ${iconBtn}`} aria-label="Close menu">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-8">
          <nav aria-label="Menu">
            {navItems.map((item, i) => (
              <div
                key={item._id}
                // Only while the drawer is open: an element that keeps a
                // finished `animation` on it cannot be animated again, and the
                // second opening would land with no motion at all.
                className={mobileOpen ? "animate-reveal" : "opacity-0"}
                style={mobileOpen ? { animationDelay: `${120 + i * 45}ms` } : undefined}
              >
                <MobileNavItem item={item} onClose={closeMobile} />
              </div>
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
                <button
                  type="button"
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
