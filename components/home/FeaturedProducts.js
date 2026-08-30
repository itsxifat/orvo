import Link from "next/link";
import ProductCard from "@/components/shop/ProductCard";
import SectionHead from "@/components/home/SectionHead";

export default function FeaturedProducts({ products = [] }) {
  if (products.length === 0) return null;

  return (
    <section className="container-custom py-14 md:py-20">
      <SectionHead eyebrow="Selected" title="The edit" href="/shop" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      <div className="mt-10 sm:hidden">
        <Link href="/shop" className="btn-outline w-full">
          View all products
        </Link>
      </div>
    </section>
  );
}
