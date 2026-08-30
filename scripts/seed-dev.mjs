// Seeds a local development database with a realistic catalogue so the whole
// storefront and admin panel can be exercised end to end.
//
//   node scripts/seed-dev.mjs            # add/refresh dev data
//   node scripts/seed-dev.mjs --reset    # wipe those collections first
//
// Never point this at production: --reset drops the catalogue collections.

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");
if (!/localhost|127\.0\.0\.1/.test(MONGODB_URI)) {
  throw new Error(`Refusing to seed a non-local database: ${MONGODB_URI}`);
}

const RESET = process.argv.includes("--reset");

// Unsplash source images — good enough to judge layout and colour weight.
const IMG = {
  shirtWhite: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
  shirtBlue: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200&q=80",
  teeBlack: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&q=80",
  teeWhite: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1200&q=80",
  jacket: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200&q=80",
  coat: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=1200&q=80",
  trouser: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=80",
  denim: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80",
  dress: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200&q=80",
  dress2: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&q=80",
  knit: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=1200&q=80",
  tote: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&q=80",
  cap: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1200&q=80",
  kids: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=1200&q=80",
  kids2: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=1200&q=80",
  rackMen: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&q=80",
  rackWomen: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1400&q=80",
  rackKids: "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=1400&q=80",
  // Hero banners. Seeded at three, so the desktop art is the 800 × 1000 (4:5)
  // three-up slot; mobile art is 1080 × 1350 (4:5) for every count.
  banner1: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=1000&fit=crop&q=80",
  banner1m: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080&h=1350&fit=crop&q=80",
  banner2: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=1000&fit=crop&q=80",
  banner2m: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1080&h=1350&fit=crop&q=80",
  banner3: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop&q=80",
  banner3m: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1080&h=1350&fit=crop&q=80",
};

const sizes = (spec) =>
  spec.map(([size, price, stock]) => ({ size, price, stock }));

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("connected:", mongoose.connection.name);

  const { default: Category } = await import("../models/Category.js");
  const { default: Product } = await import("../models/Product.js");
  const { default: Settings } = await import("../models/Settings.js");
  const { default: SizeChart } = await import("../models/SizeChart.js");
  const { default: FlashSale } = await import("../models/FlashSale.js");
  const { default: Discount } = await import("../models/Discount.js");
  const { default: User } = await import("../models/User.js");

  if (RESET) {
    for (const M of [Category, Product, Settings, SizeChart, FlashSale, Discount]) {
      await M.deleteMany({});
    }
    await User.deleteMany({ email: { $in: ["admin@orvo.com", "customer@orvo.com"] } });
    console.log("reset: catalogue collections cleared");
  }

  // ── Size charts ───────────────────────────────────────────────────────────
  const topsChart = await SizeChart.create({
    name: "Tops — regular fit",
    columns: ["Size", "Chest (in)", "Length (in)", "Shoulder (in)"],
    rows: [
      ["XS", "36", "26", "16.5"],
      ["S", "38", "27", "17"],
      ["M", "40", "28", "18"],
      ["L", "42", "29", "19"],
      ["XL", "44", "30", "20"],
      ["XXL", "46", "31", "21"],
    ],
  });

  const bottomsChart = await SizeChart.create({
    name: "Bottoms — straight leg",
    columns: ["Size", "Waist (in)", "Inseam (in)", "Hip (in)"],
    rows: [
      ["28", "28", "30", "36"],
      ["30", "30", "30", "38"],
      ["32", "32", "31", "40"],
      ["34", "34", "31", "42"],
      ["36", "36", "32", "44"],
    ],
  });

  // ── Category tree ─────────────────────────────────────────────────────────
  const men = await Category.create({
    name: "Men", slug: "men", code: "MEN", gender: "men", sortOrder: 1,
    isFeatured: true, image: IMG.rackMen,
    description: "Everyday staples",
  });
  const women = await Category.create({
    name: "Women", slug: "women", code: "WMN", gender: "women", sortOrder: 2,
    isFeatured: true, image: IMG.rackWomen,
    description: "Considered shapes",
  });
  const kids = await Category.create({
    name: "Kids", slug: "kids", code: "KID", gender: "kids", sortOrder: 3,
    isFeatured: true, image: IMG.rackKids,
    description: "Built to be played in",
  });

  const mkChild = (name, slug, code, parent, gender, order) =>
    Category.create({ name, slug, code, parent, gender, sortOrder: order });

  const menShirts = await mkChild("Shirts", "mens-shirts", "SHT", men._id, "men", 1);
  const menTees = await mkChild("T-Shirts", "mens-tshirts", "TEE", men._id, "men", 2);
  const menOuter = await mkChild("Outerwear", "mens-outerwear", "OUT", men._id, "men", 3);
  const menTrousers = await mkChild("Trousers", "mens-trousers", "TRS", men._id, "men", 4);
  await mkChild("Oxford", "mens-shirts-oxford", "OXF", menShirts._id, "men", 1);
  await mkChild("Casual", "mens-shirts-casual", "CSL", menShirts._id, "men", 2);

  const womenDresses = await mkChild("Dresses", "womens-dresses", "DRS", women._id, "women", 1);
  const womenKnit = await mkChild("Knitwear", "womens-knitwear", "KNT", women._id, "women", 2);
  const womenTrousers = await mkChild("Trousers", "womens-trousers", "WTR", women._id, "women", 3);

  const kidsTops = await mkChild("Tops", "kids-tops", "KTP", kids._id, "kids", 1);

  const accessories = await Category.create({
    name: "Accessories", slug: "accessories", code: "ACC", gender: "all", sortOrder: 4,
  });

  console.log("categories:", await Category.countDocuments());

  // ── Products ──────────────────────────────────────────────────────────────
  const P = [
    {
      name: "Field Oxford Shirt", slug: "field-oxford-shirt", skuBase: "ORV-0001",
      category: menShirts._id, gender: "men", sizeChart: topsChart._id,
      images: [IMG.shirtWhite, IMG.shirtBlue],
      description:
        "A midweight oxford cut a little boxier than the usual, with a soft collar that sits well open or buttoned.\n\nPre-washed so it will not shrink on you, and finished with a single chest pocket.",
      material: "100% combed cotton oxford, 140 gsm",
      careInstructions: "Cold machine wash, hang dry, warm iron",
      tags: ["oxford", "everyday", "cotton"],
      featured: true, isNewArrival: true,
      variants: sizes([["S", 1890, 12], ["M", 1890, 3], ["L", 1990, 0], ["XL", 1990, 7]]),
    },
    {
      name: "Chambray Work Shirt", slug: "chambray-work-shirt", skuBase: "ORV-0002",
      category: menShirts._id, gender: "men", sizeChart: topsChart._id,
      images: [IMG.shirtBlue, IMG.shirtWhite],
      description: "Indigo chambray with a relaxed body and double chest pockets. Softens with every wash.",
      material: "100% cotton chambray, 160 gsm",
      careInstructions: "Machine wash cold with like colours",
      tags: ["chambray", "workwear"],
      featured: true,
      variants: sizes([["S", 2190, 6], ["M", 2190, 9], ["L", 2290, 4], ["XL", 2290, 2]]),
    },
    {
      name: "Weekday Tee", slug: "weekday-tee", skuBase: "ORV-0003",
      category: menTees._id, gender: "unisex", sizeChart: topsChart._id,
      images: [IMG.teeWhite, IMG.teeBlack],
      description: "The plain one you reach for first. Heavy enough to hold its shape, ribbed at the neck so it never gapes.",
      material: "220 gsm combed cotton jersey",
      careInstructions: "Machine wash cold, tumble dry low",
      tags: ["tee", "basics"],
      featured: true, isNewArrival: true,
      variants: sizes([["XS", 690, 20], ["S", 690, 18], ["M", 690, 24], ["L", 740, 11], ["XL", 740, 5], ["XXL", 790, 0]]),
    },
    {
      name: "Heavy Pocket Tee", slug: "heavy-pocket-tee", skuBase: "ORV-0004",
      category: menTees._id, gender: "unisex", sizeChart: topsChart._id,
      images: [IMG.teeBlack, IMG.teeWhite],
      description: "A boxier tee in a heavier loopback, with a patch pocket that keeps its edge.",
      material: "260 gsm cotton",
      careInstructions: "Wash inside out, cold",
      tags: ["tee", "heavyweight"],
      isNewArrival: true,
      variants: sizes([["S", 890, 8], ["M", 890, 14], ["L", 940, 6], ["XL", 940, 0]]),
    },
    {
      name: "Utility Overshirt", slug: "utility-overshirt", skuBase: "ORV-0005",
      category: menOuter._id, gender: "men", sizeChart: topsChart._id,
      images: [IMG.jacket, IMG.coat],
      description: "Half jacket, half shirt. Washed cotton twill with four pockets and a straight hem.",
      material: "Washed cotton twill, 280 gsm",
      careInstructions: "Machine wash cold, line dry",
      tags: ["overshirt", "outerwear"],
      featured: true,
      variants: sizes([["S", 3450, 4], ["M", 3450, 7], ["L", 3590, 3], ["XL", 3590, 1]]),
    },
    {
      name: "Quilted Liner Jacket", slug: "quilted-liner-jacket", skuBase: "ORV-0006",
      category: menOuter._id, gender: "men", sizeChart: topsChart._id,
      images: [IMG.coat, IMG.jacket],
      description: "A light quilted liner for the two weeks a year Dhaka actually needs one.",
      material: "Recycled nylon shell, poly fill",
      careInstructions: "Do not tumble dry",
      tags: ["jacket", "layering"],
      variants: sizes([["M", 4790, 2], ["L", 4790, 0], ["XL", 4890, 0]]),
    },
    {
      name: "Pleated Wide Trouser", slug: "pleated-wide-trouser", skuBase: "ORV-0007",
      category: menTrousers._id, gender: "men", sizeChart: bottomsChart._id,
      images: [IMG.trouser, IMG.denim],
      description: "A single-pleat trouser with a wide, straight leg and a clean finished waistband.",
      material: "Cotton-linen blend",
      careInstructions: "Dry clean or gentle cold wash",
      tags: ["trouser", "pleated"],
      featured: true,
      variants: sizes([["30", 2690, 5], ["32", 2690, 8], ["34", 2790, 4], ["36", 2790, 2]]),
    },
    {
      name: "Rigid Selvedge Denim", slug: "rigid-selvedge-denim", skuBase: "ORV-0008",
      category: menTrousers._id, gender: "men", sizeChart: bottomsChart._id,
      images: [IMG.denim, IMG.trouser],
      description: "14 oz rigid selvedge, cut straight. It will fade exactly where you sit and walk.",
      material: "14 oz selvedge denim",
      careInstructions: "Wash rarely, cold, inside out",
      tags: ["denim", "selvedge"],
      isNewArrival: true,
      variants: sizes([["30", 4290, 3], ["32", 4290, 6], ["34", 4290, 0], ["36", 4390, 1]]),
    },
    {
      name: "Column Midi Dress", slug: "column-midi-dress", skuBase: "ORV-0009",
      category: womenDresses._id, gender: "women", sizeChart: topsChart._id,
      images: [IMG.dress, IMG.dress2],
      description: "A straight column that skims rather than clings, with a hidden side zip and deep pockets.",
      material: "Viscose-linen blend",
      careInstructions: "Gentle cold wash, cool iron",
      tags: ["dress", "midi"],
      featured: true, isNewArrival: true,
      variants: sizes([["XS", 3290, 4], ["S", 3290, 9], ["M", 3290, 6], ["L", 3390, 3], ["XL", 3390, 0]]),
    },
    {
      name: "Tiered Poplin Dress", slug: "tiered-poplin-dress", skuBase: "ORV-0010",
      category: womenDresses._id, gender: "women", sizeChart: topsChart._id,
      images: [IMG.dress2, IMG.dress],
      description: "Crisp poplin gathered into two soft tiers. Light enough for the hottest week of the year.",
      material: "100% cotton poplin",
      careInstructions: "Machine wash cold, hang to dry",
      tags: ["dress", "poplin", "summer"],
      variants: sizes([["XS", 2890, 2], ["S", 2890, 7], ["M", 2890, 5], ["L", 2990, 0]]),
    },
    {
      name: "Merino Crew Sweater", slug: "merino-crew-sweater", skuBase: "ORV-0011",
      category: womenKnit._id, gender: "women", sizeChart: topsChart._id,
      images: [IMG.knit, IMG.dress],
      description: "Fine-gauge merino with a close crew neck. Warm without bulk.",
      material: "100% extra-fine merino wool",
      careInstructions: "Hand wash cool, dry flat",
      tags: ["knit", "merino", "wool"],
      featured: true,
      variants: sizes([["XS", 3990, 3], ["S", 3990, 5], ["M", 3990, 4], ["L", 4090, 2]]),
    },
    {
      name: "Wide Crop Trouser", slug: "wide-crop-trouser", skuBase: "ORV-0012",
      category: womenTrousers._id, gender: "women", sizeChart: bottomsChart._id,
      images: [IMG.trouser, IMG.knit],
      description: "A cropped wide leg that sits high and finishes just above the ankle.",
      material: "Tencel-cotton twill",
      careInstructions: "Cold wash, warm iron",
      tags: ["trouser", "cropped"],
      isNewArrival: true,
      variants: sizes([["28", 2490, 6], ["30", 2490, 8], ["32", 2590, 3], ["34", 2590, 0]]),
    },
    {
      name: "Kids Play Tee", slug: "kids-play-tee", skuBase: "ORV-0013",
      category: kidsTops._id, gender: "kids", sizeChart: topsChart._id,
      images: [IMG.kids, IMG.kids2],
      description: "Reinforced at the shoulders and pre-shrunk, because it is going to get destroyed anyway.",
      material: "180 gsm cotton jersey",
      careInstructions: "Hot wash is fine",
      tags: ["kids", "tee"],
      isNewArrival: true,
      variants: sizes([["XS", 490, 15], ["S", 490, 12], ["M", 540, 9], ["L", 540, 4]]),
    },
    {
      name: "Kids Zip Hoodie", slug: "kids-zip-hoodie", skuBase: "ORV-0014",
      category: kidsTops._id, gender: "kids", sizeChart: topsChart._id,
      images: [IMG.kids2, IMG.kids],
      description: "Brushed-back fleece with a chunky zip pull small hands can actually use.",
      material: "320 gsm cotton fleece",
      careInstructions: "Machine wash warm",
      tags: ["kids", "hoodie"],
      variants: sizes([["XS", 1190, 5], ["S", 1190, 7], ["M", 1290, 2], ["L", 1290, 0]]),
    },
    {
      name: "Canvas Carry Tote", slug: "canvas-carry-tote", skuBase: "ORV-0015",
      category: accessories._id, gender: "unisex",
      images: [IMG.tote, IMG.cap],
      description: "16 oz canvas, boxed base, webbing handles long enough to go over a shoulder.",
      material: "16 oz cotton canvas",
      careInstructions: "Spot clean",
      tags: ["bag", "tote", "canvas"],
      featured: true,
      variants: sizes([["One Size", 1290, 22]]),
    },
    {
      name: "Six-Panel Cap", slug: "six-panel-cap", skuBase: "ORV-0016",
      category: accessories._id, gender: "unisex",
      images: [IMG.cap, IMG.tote],
      description: "Unstructured six-panel with a curved brim and a metal back closure.",
      material: "Washed cotton twill",
      careInstructions: "Spot clean only",
      tags: ["cap", "hat"],
      isNewArrival: true,
      variants: sizes([["One Size", 890, 0]]),
    },
  ];

  const created = [];
  for (const p of P) {
    const doc = await Product.create({
      ...p,
      isPublished: true,
      variants: p.variants.map((v) => ({ ...v, sku: `${p.skuBase}-${v.size}` })),
    });
    created.push(doc);
  }
  console.log("products:", created.length);

  // ── Settings ──────────────────────────────────────────────────────────────
  await Settings.deleteMany({});
  await Settings.create({
    siteInfo: {
      siteName: "Orvo",
      merchantId: "ORVO-DHK-01",
      whatsappNumber: "8801711223344",
      phone: "+880 1711 223344",
      email: "hello@orvo.com",
      address: "House 42, Road 11, Banani, Dhaka 1213",
      freeShippingThreshold: 1500,
      shippingFee: 80,
    },
    socialLinks: {
      facebook: "https://facebook.com/orvo",
      instagram: "https://instagram.com/orvo",
      tiktok: "https://tiktok.com/@orvo",
    },
    announcementBar: {
      enabled: true,
      text: "",
      link: "",
    },
    sku: {
      enabled: true, codeSource: "prefix", prefix: "ORV", separator: "-",
      padding: 4, appendSize: true, appendToSlug: false, nextNumber: 17,
    },
    shipping: {
      freeShippingEnabled: true, freeShippingThreshold: 1500,
      insideDhaka: 60, suburbs: 100, outsideDhaka: 130,
    },
    heroBanners: [
      {
        imageDesktop: IMG.banner1, imageMobile: IMG.banner1m,
        href: "/shop", alt: "Season 01 — shop the new drop",
      },
      {
        imageDesktop: IMG.banner2, imageMobile: IMG.banner2m,
        href: "/shop?newArrival=true", alt: "New arrivals, added every Thursday",
      },
      {
        imageDesktop: IMG.banner3, imageMobile: IMG.banner3m,
        href: "/shop?category=women", alt: "The women's line",
      },
    ],
    navItems: [
      { type: "category", label: "Men", href: "/shop?category=men", categoryId: men._id, order: 1, isActive: true },
      { type: "category", label: "Women", href: "/shop?category=women", categoryId: women._id, order: 2, isActive: true },
      { type: "category", label: "Kids", href: "/shop?category=kids", categoryId: kids._id, order: 3, isActive: true },
      { type: "category", label: "Accessories", href: "/shop?category=accessories", categoryId: accessories._id, order: 4, isActive: true },
      { type: "custom", label: "New in", href: "/shop?newArrival=true", order: 5, isActive: true },
      { type: "custom", label: "Sale", href: "/shop?onSale=true", order: 6, isActive: true, highlighted: true },
    ],
    promoBanner: {
      enabled: true,
      headline: "Mid-season reset",
      subtext: "Selected pieces from the first two drops, marked down while the sizes last.",
      note: "Free delivery on every sale order",
      decorativeText: "30%",
      primaryLabel: "Shop the sale",
      primaryHref: "/shop?onSale=true",
      secondaryLabel: "Everything else",
      secondaryHref: "/shop",
    },
    testimonials: [
      { name: "Nusrat Jahan", location: "Dhanmondi", rating: 5, sortOrder: 1,
        text: "The oxford is the first shirt I have bought online that fitted straight out of the bag. Ordered two more the same week." },
      { name: "Tanvir Ahmed", location: "Chattogram", rating: 5, sortOrder: 2,
        text: "Ordered on Sunday night, had it Tuesday morning in Chattogram. The packaging was tidy and the size guide was accurate." },
      { name: "Farhana Karim", location: "Uttara", rating: 4, sortOrder: 3,
        text: "The midi dress is beautifully cut and the pockets are deep enough for a phone. Took one star off only because my first size was out of stock." },
      { name: "Rezaul Hoque", location: "Sylhet", rating: 5, sortOrder: 4,
        text: "Exchanged a trouser for a size up with no argument at all. Whoever answers the WhatsApp actually knows the products." },
      { name: "Sabrina Islam", location: "Gulshan", rating: 5, sortOrder: 5,
        text: "The merino crew is genuinely fine-gauge, not the thick scratchy stuff sold as merino elsewhere in Dhaka." },
    ],
  });
  console.log("settings: written");

  // ── Flash sale ────────────────────────────────────────────────────────────
  const flashPicks = [
    { slug: "weekday-tee", salePrice: 490, stockLimit: 30, soldCount: 22 },
    { slug: "canvas-carry-tote", salePrice: 890, stockLimit: 20, soldCount: 17 },
    { slug: "heavy-pocket-tee", salePrice: 640, stockLimit: 15, soldCount: 3 },
    { slug: "kids-play-tee", salePrice: 340, stockLimit: 25, soldCount: 25 },
  ];
  await FlashSale.create({
    title: "48-hour drop",
    subtitle: "Four pieces, a fixed allocation each. When they are claimed, they are gone.",
    enabled: true,
    startsAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 42 * 60 * 60 * 1000),
    items: flashPicks.map((f) => ({
      product: created.find((p) => p.slug === f.slug)._id,
      salePrice: f.salePrice,
      stockLimit: f.stockLimit,
      soldCount: f.soldCount,
    })),
  });
  console.log("flash sale: written");

  // ── Discount ──────────────────────────────────────────────────────────────
  await Discount.create({
    title: "Welcome 10%",
    description: "10% off any order over Tk 1,500.",
    method: "code",
    code: "ORVO10",
    type: "percentage",
    value: 10,
    maxDiscount: 800,
    minSubtotal: 1500,
    usageLimit: 500,
    perCustomerLimit: 1,
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    active: true,
  });
  await Discount.create({
    title: "Free delivery over Tk 3,000",
    method: "automatic",
    type: "free_shipping",
    minSubtotal: 3000,
    priority: 10,
    allowStacking: true,
    active: true,
  });
  console.log("discounts: written");

  // ── Accounts ──────────────────────────────────────────────────────────────
  const pass = await bcrypt.hash("Orvo!2026", 10);
  await User.deleteMany({ email: { $in: ["admin@orvo.com", "customer@orvo.com"] } });
  await User.create({
    name: "Orvo Admin", email: "admin@orvo.com", password: pass,
    role: "superadmin", emailVerified: true, phone: "01711223344",
  });
  await User.create({
    name: "Test Customer", email: "customer@orvo.com", password: pass,
    role: "customer", emailVerified: true, phone: "01799887766",
    address: { street: "House 9, Road 4, Dhanmondi", city: "Dhaka", postalCode: "1205" },
  });
  console.log("accounts: admin@orvo.com / customer@orvo.com  (password: Orvo!2026)");

  await mongoose.disconnect();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
