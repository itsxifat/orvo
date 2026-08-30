import Link from "next/link";
import ProductCard from "@/components/shop/ProductCard";
import SectionHead from "@/components/home/SectionHead";

export default function NewArrivals({ products = [] }) {
  if (products.length === 0) return null;

  return (
    <section className="container-custom py-14 md:py-20">
      <div className="rounded-4xl md:rounded-5xl bg-paper-pure shadow-soft p-6 sm:p-10 lg:p-14">
        <SectionHead
          eyebrow="Landed this week"
          title="New in"
          href="/shop?newArrival=true"
          linkLabel="See everything new"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>

        <div className="mt-10 flex justify-center sm:hidden">
          <Link href="/shop?newArrival=true" className="btn-beam w-full">
            Shop new arrivals
          </Link>
        </div>
      </div>
    </section>
  );
}
