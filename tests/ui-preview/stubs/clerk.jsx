// Preview-only stand-in for @clerk/nextjs. Never bundled into the Next.js app.
// One function for the page's lifetime, like Clerk's: effects that depend on
// getToken would otherwise re-run (and refetch) on every render.
const getToken = async () => "preview-token";
export function useAuth() {
  return { isLoaded: true, isSignedIn: true, userId: "preview", getToken };
}
export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: { fullName: "Ibrahim", firstName: "Ibrahim", imageUrl: null, publicMetadata: {} },
  };
}
function Avatar() {
  return (
    <span className="bg-foreground text-background grid size-9 place-items-center rounded-[4px] text-[13px] font-extrabold">
      IB
    </span>
  );
}
export function UserButton() {
  return <Avatar />;
}
UserButton.MenuItems = function MenuItems() {
  return null;
};
UserButton.Link = function MenuLink() {
  return null;
};
UserButton.Action = function MenuAction() {
  return null;
};
export function SignIn() {
  return <div>Sign in</div>;
}
export function SignOutButton({ children }) {
  return children ?? <button type="button">Sign out</button>;
}
export function ClerkProvider({ children }) {
  return children;
}
