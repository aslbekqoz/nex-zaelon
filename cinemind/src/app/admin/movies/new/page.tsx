import type { Metadata } from "next";
import { MovieForm } from "@/components/admin/MovieForm";
import { allGenres } from "@/lib/admin/repository";

export const metadata: Metadata = { title: "Add movie" };

export default async function NewMoviePage() {
  return (
    <>
      <h2 style={{ margin: "8px 0 4px" }}>Add a movie</h2>
      <p className="muted">For films that aren&apos;t on TMDB, or when you want full control over the details.</p>
      <MovieForm movie={{}} genres={await allGenres()} />
    </>
  );
}
