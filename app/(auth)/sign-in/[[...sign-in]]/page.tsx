import { stagingSignIn } from "@/lib/staging-sign-in";

import { SignInView } from "./sign-in-view";

// Rendered per request: STAGING_OTP arrives with the container's runtime
// environment, after the image is built.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <SignInView staging={stagingSignIn() !== null} />;
}
