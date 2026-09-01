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
// The app's own SKU builder, so seeded codes are byte-identical to the ones the
// admin panel would mint ("One Size" → OS, not a code with a space in it — the
// scanner has to be able to read these).
import { buildVariantSku } from "../lib/sku.js";

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

const SKU_CFG = {
  enabled: true, codeSource: "prefix", prefix: "ORV", separator: "-",
  padding: 4, appendSize: true, appendToSlug: false,
};

const sizes = (spec) =>
  spec.map(([size, price, stock]) => ({ size, price, stock }));

// The customer roster the orders below are drawn from. Order volume follows
// this list's order — the names near the top become the repeat buyers — and the
// last four are guest stubs (no login) so that path is represented too.
const PEOPLE = [
  { name: "Nusrat Jahan", email: "nusrat.jahan@example.com", phone: "01711045566",
    street: "House 12, Road 7, Dhanmondi", city: "Dhaka", postalCode: "1205", zone: "inside_dhaka" },
  { name: "Farhana Karim", email: "farhana.karim@example.com", phone: "01911554433",
    street: "House 3, Sector 7, Uttara", city: "Dhaka", postalCode: "1230", zone: "inside_dhaka" },
  { name: "Tanvir Ahmed", email: "tanvir.ahmed@example.com", phone: "01812337788",
    street: "Flat 4B, Nasirabad Housing Society", city: "Chattogram", postalCode: "4000", zone: "outside_dhaka" },
  { name: "Sabrina Islam", email: "sabrina.islam@example.com", phone: "01755112200",
    street: "House 41, Road 113, Gulshan 2", city: "Dhaka", postalCode: "1212", zone: "inside_dhaka" },
  { name: "Mahmudul Hasan", email: "mahmudul.hasan@example.com", phone: "01521446677",
    street: "Bank Colony, Savar", city: "Savar", postalCode: "1340", zone: "suburbs" },
  { name: "Rezaul Hoque", email: "rezaul.hoque@example.com", phone: "01611778899",
    street: "Zindabazar Main Road", city: "Sylhet", postalCode: "3100", zone: "outside_dhaka" },
  { name: "Ishrat Binte Alam", email: "ishrat.alam@example.com", phone: "01327889900",
    street: "House 9, Road 2, Bashundhara R/A", city: "Dhaka", postalCode: "1229", zone: "inside_dhaka" },
  { name: "Arif Mahmud", email: "arif.mahmud@example.com", phone: "01717334455",
    street: "Shaheb Bazar, Ghoramara", city: "Rajshahi", postalCode: "6100", zone: "outside_dhaka" },
  { name: "Tahmina Akter", email: "tahmina.akter@example.com", phone: "01866221133",
    street: "House 18, Block C, Mirpur 10", city: "Dhaka", postalCode: "1216", zone: "inside_dhaka" },
  { name: "Shahriar Kabir", email: "shahriar.kabir@example.com", phone: "01977445566",
    street: "Kanchpur, Sonargaon", city: "Narayanganj", postalCode: "1440", zone: "suburbs" },
  // ── Guest stubs: ordered without ever registering ────────────────────────
  { name: "Rakib Hossain", phone: "01988223311", guest: true,
    street: "Ward 5, College Road", city: "Narayanganj", postalCode: "1400", zone: "suburbs" },
  { name: "Sumaiya Rahman", phone: "01633447722", guest: true,
    street: "Modhupur Bazar Road", city: "Tangail", postalCode: "1900", zone: "outside_dhaka" },
  { name: "Jubayer Alam", email: "jubayer.alam@example.com", phone: "01511668844", guest: true,
    street: "House 27, Road 5, Nikunja 2", city: "Dhaka", postalCode: "1229", zone: "inside_dhaka" },
  { name: "Anika Tabassum", phone: "01744556611", guest: true,
    street: "Station Road, Kushtia Sadar", city: "Kushtia", postalCode: "7000", zone: "outside_dhaka" },
];

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
  const { default: Order } = await import("../models/Order.js");
  const { default: Notification } = await import("../models/Notification.js");

  if (RESET) {
    for (const M of [Category, Product, Settings, SizeChart, FlashSale, Discount, Order, Notification]) {
      await M.deleteMany({});
    }
    // Only the accounts this script owns — a dev's own staff logins survive.
    await User.deleteMany({
      $or: [
        { email: { $in: ["admin@orvo.com", "customer@orvo.com", ...PEOPLE.filter((p) => p.email).map((p) => p.email)] } },
        { phone: { $in: PEOPLE.map((p) => p.phone) } },
      ],
    });
    console.log("reset: catalogue, orders and seeded accounts cleared");
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
      variants: p.variants.map((v) => ({ ...v, sku: buildVariantSku(SKU_CFG, p.skuBase, v.size) })),
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
    sku: { ...SKU_CFG, nextNumber: 17 },
    shipping: {
      // Zone fees apply below the threshold; above it delivery is free and the
      // automatic discount records why. Three things state this number and must
      // agree: here, siteInfo.freeShippingThreshold, and the hardcoded promise
      // strip in components/layout/TopStrip.js. Keep freeShippingEnabled off —
      // on, it frees *every* order and the zones stop mattering.
      freeShippingEnabled: false, freeShippingThreshold: 1500,
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
  const welcomeDiscount = await Discount.create({
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
  const freeShipDiscount = await Discount.create({
    title: "Free delivery over Tk 1,500",
    method: "automatic",
    type: "free_shipping",
    minSubtotal: 1500,
    priority: 10,
    allowStacking: true,
    active: true,
  });
  console.log("discounts: written");

  // ── Accounts ──────────────────────────────────────────────────────────────
  const pass = await bcrypt.hash("Orvo!2026", 10);
  await User.deleteMany({ email: { $in: ["admin@orvo.com", "customer@orvo.com"] } });
  const admin = await User.create({
    name: "Orvo Admin", email: "admin@orvo.com", password: pass,
    role: "superadmin", emailVerified: true, phone: "01711223344",
  });
  const testCustomer = await User.create({
    name: "Test Customer", email: "customer@orvo.com", password: pass,
    role: "customer", emailVerified: true, phone: "01799887766",
    address: { street: "House 9, Road 4, Dhanmondi", city: "Dhaka", postalCode: "1205" },
  });
  console.log("accounts: admin@orvo.com / customer@orvo.com  (password: Orvo!2026)");

  // ── Customers ─────────────────────────────────────────────────────────────
  // A mix of real accounts and guest stubs — the kind lib/customer-link.js
  // creates when an order arrives from someone who never signed up — so the
  // customers table, the guest-claim flow and the new-vs-returning split in
  // analytics all have something to work on.
  const custPass = await bcrypt.hash("Orvo!2026", 10);
  const people = [];
  for (const p of PEOPLE) {
    const doc = await User.create({
      name: p.name,
      role: "customer",
      phone: p.phone,
      address: { street: p.street, city: p.city, postalCode: p.postalCode },
      ...(p.guest
        ? { isGuest: true, guestSource: "pos", ...(p.email ? { email: p.email } : {}) }
        : { email: p.email, password: custPass, emailVerified: true }),
    });
    people.push({ ...p, doc });
  }
  // The signed-in test account buys too, so /account/orders is not empty.
  people.unshift({
    name: "Test Customer", email: "customer@orvo.com", phone: "01799887766",
    street: "House 9, Road 4, Dhanmondi", city: "Dhaka", postalCode: "1205",
    zone: "inside_dhaka", doc: testCustomer,
  });
  console.log("customers:", people.length, `(${people.filter((p) => p.guest).length} guest stubs)`);

  // ── Orders ────────────────────────────────────────────────────────────────
  // Four months of trading, generated from a fixed seed so every run produces
  // the same numbers and one dashboard screenshot stays comparable to the next.
  // The spread is deliberate: every order status, sales channel, payment method
  // and shipping zone appears, alongside discounted orders, returns,
  // cancellations and courier consignments, so no admin screen comes up empty.
  let _s = 20260831;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const chance = (p) => rnd() < p;
  const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const money = (n) => Math.round(n);
  const hex = (n) =>
    Array.from({ length: n }, () => "0123456789ABCDEF"[int(0, 15)]).join("");

  const DAY = 86400000;
  const now = Date.now();
  const SHIP = { inside_dhaka: 60, suburbs: 100, outside_dhaka: 130 };
  const FREE_OVER = 1500; // matches the automatic free-delivery discount above

  // Courier history per phone, so a repeat buyer shows the same record on every
  // one of their orders (that is how the real Steadfast lookup behaves).
  for (const p of people) {
    const delivered = int(2, 40);
    const cancelled = int(0, Math.max(1, Math.round(delivered * 0.35)));
    const total = delivered + cancelled;
    p.fraud = {
      status: "done",
      delivered,
      cancelled,
      frauds: chance(0.12) ? int(1, 3) : 0,
      totalParcels: total,
      successRate: Math.round((delivered / total) * 100),
      autoProcessed: false,
      checkedAt: null,
      error: "",
    };
  }

  const sellable = created.filter((p) => p.variants.length);
  const lineOf = (product, variant, quantity) => ({
    product: product._id,
    name: product.name,
    image: product.images[0],
    sku: variant.sku,
    size: variant.size,
    price: variant.price,
    quantity,
  });

  // The storefront carries most of the volume; social and phone make up the rest.
  const CHANNELS = [
    ...Array(11).fill("website"), ...Array(3).fill("facebook"),
    ...Array(2).fill("instagram"), "whatsapp", "phone", "offline",
  ];

  const drafts = [];
  for (let i = 0; i < 68; i++) {
    // Recency-weighted: busier in the last few weeks than four months back.
    const daysAgo = Math.floor(118 * Math.pow(rnd(), 1.7));
    const at = new Date(
      now - daysAgo * DAY - int(9, 22) * 3600000 - int(0, 59) * 60000
    );
    // Same curve over the customer list, so the people at the top of it become
    // the repeat buyers.
    const person = people[Math.floor(Math.pow(rnd(), 1.8) * people.length)];

    const items = [];
    const seen = new Set();
    for (let k = 0, n = chance(0.5) ? 1 : chance(0.65) ? 2 : 3; k < n; k++) {
      const prod = pick(sellable);
      if (seen.has(prod.slug)) continue;
      seen.add(prod.slug);
      items.push(lineOf(prod, pick(prod.variants), chance(0.16) ? 2 : 1));
    }
    if (!items.length) items.push(lineOf(sellable[0], sellable[0].variants[0], 1));

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const freeShip = subtotal >= FREE_OVER;
    const shippingFee = freeShip ? 0 : SHIP[person.zone];

    let discount = 0;
    const discountCodes = [];
    const appliedDiscounts = [];
    if (subtotal >= 1500 && chance(0.26)) {
      discount = Math.min(money(subtotal * 0.1), 800);
      discountCodes.push("ORVO10");
      appliedDiscounts.push({
        discount: welcomeDiscount._id, code: "ORVO10", title: "Welcome 10%",
        type: "percentage", amount: discount,
      });
    }
    if (freeShip) {
      appliedDiscounts.push({
        discount: freeShipDiscount._id, title: "Free delivery over Tk 1,500",
        type: "free_shipping", amount: 0, freeShipping: true,
      });
    }
    const totalAmount = money(subtotal - discount + shippingFee);

    // Older orders have finished their journey; recent ones are still moving.
    let orderStatus;
    if (daysAgo > 12) orderStatus = chance(0.88) ? "delivered" : "cancelled";
    else if (daysAgo > 6)
      orderStatus = chance(0.62) ? "delivered" : chance(0.55) ? "shipped" : "cancelled";
    else if (daysAgo > 2) orderStatus = pick(["shipped", "shipped", "delivered", "processing"]);
    else orderStatus = pick(["pending", "pending", "processing", "shipped"]);

    const source = pick(CHANNELS);
    const manual = source !== "website";
    const paymentMethod =
      source === "offline" ? "cash"
      : source === "website" ? pick(["cod", "cod", "cod", "sslcommerz", "sslcommerz", "bkash"])
      : pick(["cod", "cod", "bkash", "nagad", "bank"]);
    const prepaid = ["sslcommerz", "bkash", "nagad", "bank"].includes(paymentMethod);

    let paymentStatus;
    if (orderStatus === "delivered") paymentStatus = "paid";
    else if (orderStatus === "cancelled")
      paymentStatus = paymentMethod === "sslcommerz" && chance(0.4) ? "failed" : "pending";
    else if (prepaid) paymentStatus = chance(0.85) ? "paid" : "pending";
    else paymentStatus = "pending";

    const shipped = orderStatus === "shipped" || orderStatus === "delivered";
    const sentAt = shipped ? new Date(at.getTime() + DAY * (0.5 + rnd())) : null;
    const deliveredAt = shipped ? new Date(sentAt.getTime() + DAY * (1 + rnd() * 2)) : null;

    const courier = shipped
      ? {
          provider: "steadfast",
          consignmentId: 4210000 + i * 37 + int(1, 30),
          trackingCode: hex(8),
          status: orderStatus === "delivered" ? "delivered" : "in_review",
          deliveryCharge: shippingFee || SHIP[person.zone],
          sentAt,
          lastWebhookAt: orderStatus === "delivered" ? deliveredAt : sentAt,
          error: "",
          trackingMessages: [
            { message: "Consignment created", at: sentAt },
            { message: "Picked up from merchant", at: new Date(sentAt.getTime() + 6 * 3600000) },
            ...(orderStatus === "delivered"
              ? [{ message: "Delivered to customer", at: deliveredAt }]
              : [{ message: "Out for delivery", at: new Date(sentAt.getTime() + DAY) }]),
          ],
        }
      : {};

    const editHistory = [];
    if (manual) {
      editHistory.push({
        at, by: admin._id, byName: "Orvo Admin", action: "edit",
        summary: `Order keyed in from ${source}`, pinVerified: true,
      });
    }
    if (shipped) {
      editHistory.push({
        at: sentAt, by: admin._id, byName: "Orvo Admin", action: "status_change",
        summary: "Status: processing → shipped", pinVerified: true,
      });
    }
    if (orderStatus === "delivered") {
      editHistory.push({
        at: deliveredAt, by: null, byName: "Steadfast webhook", action: "status_change",
        summary: "Status: shipped → delivered", pinVerified: false,
      });
    }
    if (orderStatus === "cancelled") {
      editHistory.push({
        at: new Date(at.getTime() + DAY * (1 + rnd())), by: admin._id, byName: "Orvo Admin",
        action: "status_change",
        summary: pick([
          "Cancelled — customer unreachable after three calls",
          "Cancelled — customer changed their mind",
          "Cancelled — courier returned, address not found",
        ]),
        pinVerified: true,
      });
    }

    drafts.push({
      at,
      doc: {
        user: person.doc._id,
        items,
        shippingAddress: {
          name: person.name, phone: person.phone, email: person.email,
          street: person.street, city: person.city, postalCode: person.postalCode,
          country: "Bangladesh",
        },
        source,
        createdBy: manual ? admin._id : null,
        createdByName: manual ? "Orvo Admin" : "",
        paymentMethod, paymentStatus, orderStatus,
        shippingZone: person.zone,
        subtotal, shippingFee, discount, discountCodes, appliedDiscounts, totalAmount,
        ...(paymentStatus === "paid" && prepaid ? { transactionId: `TXN${hex(10)}` } : {}),
        notes: chance(0.15) ? pick([
          "Please call before delivery.",
          "Deliver after 5pm — office address.",
          "Gift wrap requested.",
          "Customer asked to swap size if it does not fit.",
        ]) : "",
        courier,
        fraudCheck: { ...person.fraud, checkedAt: new Date(at.getTime() + 90000) },
        editHistory,
        createdAt: at,
        updatedAt: deliveredAt || sentAt || at,
      },
    });
  }

  // A failed gateway payment is the usual reason an order dies before it ships,
  // and the "failed" filter needs stock. Forced rather than left to chance: with
  // only a handful of cancelled orders it can otherwise come up empty.
  for (const d of drafts.filter((x) => x.doc.orderStatus === "cancelled").slice(0, 2)) {
    d.doc.paymentMethod = "sslcommerz";
    d.doc.paymentStatus = "failed";
    delete d.doc.transactionId;
    d.doc.editHistory.unshift({
      at: new Date(d.at.getTime() + 300000), by: null, byName: "SSLCommerz",
      action: "payment_update", summary: "Payment failed — gateway declined the card",
      pinVerified: false,
    });
  }

  // Number them in the order they were placed, the way the counter would have.
  drafts.sort((a, b) => a.at - b.at);
  const year = new Date().getFullYear();
  const orderDocs = drafts.map((d, idx) => ({
    ...d.doc,
    orderNumber: `ORV-${year}-${String(idx + 1).padStart(5, "0")}`,
  }));

  // ── Returns ───────────────────────────────────────────────────────────────
  // Recomputed exactly the way app/api/admin/orders/[id]/return does it, so the
  // returns report and the order totals agree with what the app would write.
  const returnable = orderDocs.filter(
    (o) => o.orderStatus === "delivered" && o.items.reduce((s, i) => s + i.quantity, 0) > 1
  );
  for (const o of returnable.slice(0, 5)) {
    const line = o.items[o.items.length - 1];
    line.returnedQuantity = 1;
    const waived = chance(0.5);
    const kept = o.items.reduce((s, i) => s + (i.quantity - (i.returnedQuantity || 0)) * i.price, 0);
    const effectiveDiscount = o.subtotal > 0 ? money(o.discount * (kept / o.subtotal)) : 0;
    const newTotal = Math.max(0, money(kept - effectiveDiscount + (waived ? 0 : o.shippingFee)));
    const refund = Math.max(0, money(o.totalAmount - newTotal));
    const returnedAt = new Date(o.updatedAt.getTime() + DAY * (1 + rnd() * 3));
    o.returnedAmount = refund;
    o.deliveryChargeWaived = waived;
    o.totalAmount = newTotal;
    o.returns = [{
      at: returnedAt, by: "Orvo Admin",
      items: [{ name: line.name, size: line.size, quantity: 1, price: line.price }],
      refundAmount: refund, deliveryChargeWaived: waived,
      note: pick(["Size too small, returned on delivery.", "Customer kept one of two.", "Colour not as expected."]),
    }];
    o.editHistory.push({
      at: returnedAt, by: admin._id, byName: "Orvo Admin", action: "return",
      summary: `Returned 1 × ${line.name} (${line.size}) — refund ৳${refund}`,
      pinVerified: true,
    });
    o.updatedAt = returnedAt;
  }

  const insertedOrders = await Order.insertMany(orderDocs, { timestamps: false });
  const byStatus = insertedOrders.reduce((m, o) => ({ ...m, [o.orderStatus]: (m[o.orderStatus] || 0) + 1 }), {});
  console.log("orders:", insertedOrders.length, byStatus);

  // ── Notifications ─────────────────────────────────────────────────────────
  // Enough rows for the bell, the unread badge and the notifications list.
  const EVERYONE = ["superadmin", "admin", "moderator", "staff"];
  const ELEVATED = ["superadmin", "admin"];
  const recent = [...insertedOrders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);
  const notifications = [];
  for (const o of recent) {
    const manual = o.source !== "website";
    notifications.push({
      roles: EVERYONE,
      type: manual ? "order_new_pos" : "order_new",
      severity: "info",
      title: manual
        ? `New ${o.source} order ${o.orderNumber}`
        : `New website order ${o.orderNumber}`,
      body: `${o.shippingAddress.name} — ৳${o.totalAmount} (${o.items.length} item${o.items.length === 1 ? "" : "s"}).`,
      link: `/admin/orders/${o._id}`,
      order: o._id,
      ...(manual ? { actor: admin._id, actorName: "Orvo Admin" } : {}),
      createdAt: o.createdAt,
      updatedAt: o.createdAt,
    });
  }
  for (const o of recent.filter((o) => o.orderStatus === "cancelled").slice(0, 2)) {
    notifications.push({
      roles: EVERYONE, type: "order_cancelled", severity: "warning",
      title: `Order ${o.orderNumber} cancelled`,
      body: `৳${o.totalAmount} cancelled by Orvo Admin.`,
      link: `/admin/orders/${o._id}`, order: o._id,
      actor: admin._id, actorName: "Orvo Admin",
      createdAt: new Date(o.createdAt.getTime() + DAY), updatedAt: new Date(o.createdAt.getTime() + DAY),
    });
  }
  const returned = insertedOrders.filter((o) => (o.returnedAmount || 0) > 0).slice(0, 2);
  for (const o of returned) {
    notifications.push({
      roles: ELEVATED, type: "order_returned", severity: "warning",
      title: `Return on ${o.orderNumber}`,
      body: `Refund ৳${o.returnedAmount} recorded by Orvo Admin.`,
      link: `/admin/orders/${o._id}`, order: o._id,
      actor: admin._id, actorName: "Orvo Admin",
      createdAt: o.updatedAt, updatedAt: o.updatedAt,
    });
  }
  notifications.push({
    roles: ELEVATED, type: "system", severity: "warning",
    title: "Low stock on 4 variants",
    body: "Field Oxford Shirt (L), Heavy Pocket Tee (XL), Six-Panel Cap (One Size) and Kids Zip Hoodie (L) are out of stock.",
    link: "/admin/products",
    createdAt: new Date(now - 3 * 3600000), updatedAt: new Date(now - 3 * 3600000),
  });
  notifications.push({
    roles: EVERYONE, type: "system", severity: "info",
    title: "Flash sale is live",
    body: "The 48-hour drop started six hours ago. Two of the four allocations are nearly claimed.",
    link: "/admin/flash-sales",
    createdAt: new Date(now - 6 * 3600000), updatedAt: new Date(now - 6 * 3600000),
  });
  await Notification.insertMany(notifications, { timestamps: false });
  console.log("notifications:", notifications.length);

  // ── Summary ───────────────────────────────────────────────────────────────
  const revenue = insertedOrders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((s, o) => s + o.totalAmount, 0);
  console.log(`revenue (paid): Tk ${revenue.toLocaleString()}`);

  await mongoose.disconnect();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
