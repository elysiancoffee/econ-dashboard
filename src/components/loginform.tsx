"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd, Eye, EyeClosed, Skull } from "lucide-react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginUser } = useApp();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await loginUser(username, password);
      if (success) {
        toast.success("Successfully logged in.");
        router.push("/");
        router.refresh();
      } else {
        toast.error("Invalid username or password.");
      }
    } catch {
      toast.error("An error occurred during login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <Skull className="size-6" />
              </div>
              <span className="sr-only">ECON Staff Portal</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to ECON Staff Portal</h1>
          </div>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                className="pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {showPassword ? (
                  <Eye
                    className="h-4 w-4 cursor-pointer text-muted-foreground"
                    onClick={() => setShowPassword(false)}
                  />
                ) : (
                  <EyeClosed
                    className="h-4 w-4 cursor-pointer text-muted-foreground"
                    onClick={() => setShowPassword(true)}
                  />
                )}
              </div>
            </div>
          </Field>
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Authenticating..." : "Login"}
            </Button>
          </Field>
          <FieldSeparator></FieldSeparator>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        If you have any issues logging in, please contact owl <a href="#">Ri</a>, <a href="#">Kia</a> or <a href="#">Olympia</a>.
      </FieldDescription>
      <FieldDescription className="px-6 text-center">
        Your HEX Username is your username.
      </FieldDescription>
    </div>
  );
}
