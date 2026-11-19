// The shopper's bag. Not for search results.
export const metadata = { title: "Your bag", robots: { index: false, follow: false } };

export default function CartLayout({ children }) {
  return children;
}
