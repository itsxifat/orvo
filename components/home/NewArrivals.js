import Link from "next/link";
import ProductCard from "@/components/shop/ProductCard";
import SectionHead from "@/components/home/SectionHead";
import Reveal from "@/components/motion/Reveal";

export default function NewArrivals({ products = [] }) {
  if (products.length === 0) return null;

  return (
    <section className="container-custom py-12 md:py-20">
      <div className="rounded-4xl bg-paper-pure p-5 shadow-soft sm:p-10 md:rounded-5xl lg:p-14">
        <SectionHead
          title="New in"
          href="/shop?newArrival=true"
          linkLabel="See everything new"
        />

        <div className="grid grid-cols-2 gap-x-3.5 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {products.slice(0, 8).map((product, i) => (
            <Reveal key={product._id} delay={(i % 4) * 60}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>

        <div className="mt-9 flex justify-center sm:hidden">
          <Link href="/shop?newArrival=true" className="btn-beam w-full">
            Shop new arrivals
          </Link>
        </div>
      </div>
    </section>
  );
}
