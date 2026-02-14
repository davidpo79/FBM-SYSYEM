import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "התחברות | FBM Studio",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
