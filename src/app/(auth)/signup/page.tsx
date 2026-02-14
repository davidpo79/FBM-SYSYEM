import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "הרשמה | FBM Studio",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
