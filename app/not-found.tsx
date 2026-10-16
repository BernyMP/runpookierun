import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="app-width py-24">
      <h1 className="text-3xl font-bold">A little off the path.</h1>
      <p className="my-5">This page doesn’t exist.</p>
      <Link href="/" className="font-semibold text-primary underline">
        Back to Pookie
      </Link>
    </main>
  );
}
