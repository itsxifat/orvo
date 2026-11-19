export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getSite, homeProducts, getCategoryTree, flattenCategories, getFlashSales } from "@/lib/storefront";
import HeroBanners from "@/components/home/HeroBanners";
import CategoryGrid from "@/components/home/CategoryGrid";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import PromoBanner from "@/components/home/PromoBanner";
import NewArrivals from "@/components/home/NewArrivals";
import Testimonials from "@/components/home/Testimonials";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/layout/CartDrawer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import TrackingBootstrap from "@/components/tracking/TrackingBootstrap";
import CustomUrlExperience from "@/components/layout/CustomUrlExperience";
import JsonLd from "@/components/seo/JsonLd";
import { DEFAULT_SITE_NAME, TAGLINE, organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";

// The home page's title, description and canonical address, from the shop's
// name in the ERP (lib/seo.js).
export async function generateMetadata() {
  const site = await getSite();
  const name = site?.siteInfo?.siteName || DEFAULT_SITE_NAME;
  return pageMetadata({
    title: { absolute: `${name} — ${TAGLINE}` },
    description: `${name} builds considered, everyday clothing for men, women and kids. Shop new drops, core essentials and seasonal edits — cash on delivery across Bangladesh.`,
    path: "/",
    siteName: name,
  });
}

async function getHomeData() {
  const [site, products, tree, flash] = await Promise.all([
    getSite(),
    homeProducts().catch(() => ({ featuredProducts: [], newArrivals: [] })),
    getCategoryTree(),
    getFlashSales({ home: true }).catch(() => ({ live: [] })),
  ]);

  // The collections: the categories marked featured on the ERP's Catalog
  // setup, else the first three at the top of the tree.
  const top = flattenCategories(tree).filter((c) => !c.parent);
  const featured = flattenCategories(tree).filter((c) => c.featured);
  const categories = (featured.length ? featured : top).slice(0, 3);

  return {
    featuredProducts: products.featuredProducts,
    newArrivals: products.newArrivals,
    categories,
    // The ERP's hero slides (Website → Hero), already in the banners' shape:
    // { _id, imageDesktop, imageMobile, href, alt } (lib/storefront.js).
    heroBanners: site.heroSlides,
    promoBanner: site.promoBanner,
    testimonials: site.testimonials,
    flashSales: flash.live,
    site,
  };
}

export default async function HomePage() {
  const { featuredProducts, newArrivals, categories, heroBanners, promoBanner, testimonials, flashSales, site } = await getHomeData();

  return (
    <>
      <TrackingBootstrap />
      <Navbar />
      <main>
        {/* The shop as an online store, and its search, for Google. */}
        <JsonLd data={[organizationJsonLd(site), websiteJsonLd(site)]} />
        {/* A campaign link may open on the home page (`/?cu=<code>`, a custom path). */}
        <Suspense fallback={null}>
          <CustomUrlExperience />
        </Suspense>
        <HeroBanners banners={heroBanners} />
        <FlashSaleSection sales={flashSales} />
        <CategoryGrid categories={categories} />
        <FeaturedProducts products={featuredProducts} />
        <PromoBanner promoBanner={promoBanner} />
        <NewArrivals products={newArrivals} />
        <Testimonials testimonials={testimonials} />
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </>
  );
}
