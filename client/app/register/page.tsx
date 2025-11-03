import { Button } from "@/components/ui/button";
import Link from "next/link";
import AuthForm from "../components/auth/AuthForm";

const RegisterPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-background px-4 py-12">
      <div className="space-y-6 text-center">
        <AuthForm mode="register" />
        <p className="text-sm text-muted-foreground">
          Already have an account?
          <Button asChild variant="link" className="px-0">
            <Link href={"/login"}>Sign in</Link>
          </Button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
