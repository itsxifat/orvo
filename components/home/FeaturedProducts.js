import Link from "next/link";
import ProductCard from "@/components/shop/ProductCard";
import SectionHead from "@/components/home/SectionHead";
import Reveal from "@/components/motion/Reveal";

export default function FeaturedProducts({ products = [] }) {
  if (products.length === 0) return null;

  return (
    <section className="container-custom py-12 md:py-20">
      <SectionHead title="The edit" href="/shop" />

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product, i) => (
          // Cards arrive a row at a time, not one by one down a long column —
          // the stagger follows the eye across the row and then stops.
          <Reveal key={product._id} delay={(i % 4) * 60}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>

      <div className="mt-9 sm:hidden">
        <Link href="/shop" className="btn-outline w-full">
          View all products
        </Link>
      </div>
    </section>
  );
}
