"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (!name) {
      router.push("/name"); // Redirect to name input page if no name is found
    }
  }, [router]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome to TextSync</h1>
      <p className="mb-4">Create and edit documents in real time with others.</p>
      <Link href="/documents/123" className="text-blue-500 hover:underline">
        Open Document 1
      </Link>
      <br />
      <Link href="/documents/456" className="text-blue-500 hover:underline">
        Open Document 2
      </Link>
    </div>
  );
}
