"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Settings, Tv2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Recommended", href: "/recommendedmovies" },
];

const Navbar = () => {
  const { user, loading, logout } = useAuth();

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "";

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return (
    <nav className="flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/streamly_logo.png"
            alt="Streamly Logo"
            width={32}
            height={32}
            className="rounded-full object-cover"
            priority
          />
          <span className="text-lg font-semibold">Streamly</span>
        </Link>

        <div className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!loading && !user && (
          <>
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Sign up</Link>
            </Button>
          </>
        )}

        {!loading && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-10 w-10 cursor-pointer border border-border">
                <AvatarImage
                  src=""
                  alt={`${user.first_name} ${user.last_name}`}
                />
                <AvatarFallback>{initials || "U"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuLabel className="flex flex-col">
                <span className="font-semibold">
                  {user.first_name} {user.last_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link
                  href={"/recommendedmovies"}
                  className="flex items-center gap-1"
                >
                  <Tv2 className="h-[1.2rem] w-[1.2rem] mr-2" />
                  Recommended Movies
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-[1.2rem] w-[1.2rem] mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
