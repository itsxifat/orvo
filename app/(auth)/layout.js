// Auth screens get their own shell: no navbar, no footer, no cart drawer.
// Signing in is a single task, and the storefront chrome only competes with it.
//
// Signing in, signing up and resetting a password are not for search results.
// The title takes the shop's name from the root layout's template (the ERP's
// Website → Settings).
export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function AuthLayout({ children }) {
  return <main>{children}</main>;
}
