
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const user = request.auth?.user;

  const isLoginPage = pathname === "/login";

  if (!user || !user.isActive) {
    if (isLoginPage) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);

    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
