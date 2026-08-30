// Auth screens get their own shell: no navbar, no footer, no cart drawer.
// Signing in is a single task, and the storefront chrome only competes with it.

export const metadata = {
  title: { default: "Account", template: "%s | Orvo" },
};

export default function AuthLayout({ children }) {
  return <main>{children}</main>;
}
