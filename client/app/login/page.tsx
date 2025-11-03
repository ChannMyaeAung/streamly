import { Button } from "@/components/ui/button";
import Link from "next/link";
import AuthForm from "../components/auth/AuthForm";

const LoginPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-background px-4 py-12">
      <div className="space-y-6 text-center">
        <AuthForm mode="login" />
        <p>
          New to Streamly?{" "}
          <Button asChild variant={"link"} className="px-0">
            <Link href={"/register"}>Create an account</Link>
          </Button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
