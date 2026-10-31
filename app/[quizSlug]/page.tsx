import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryQuizLanding from "@/components/CategoryQuizLanding";
import { QUIZ_PAGE_BY_SLUG, QUIZ_PAGES } from "@/lib/quiz-pages";

type PageProps = {
  params: Promise<{ quizSlug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return QUIZ_PAGES.map(({ slug }) => ({ quizSlug: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { quizSlug } = await params;
  const page = QUIZ_PAGE_BY_SLUG[quizSlug];

  if (!page) return {};

  return {
    title: `${page.name} | Play Solo or With Friends | FunFriday`,
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: `${page.name} | FunFriday`,
      description: page.description,
      url: `https://funfriday.co.in/${page.slug}`,
      type: "website"
    }
  };
}

export default async function QuizSlugPage({ params }: PageProps) {
  const { quizSlug } = await params;
  const page = QUIZ_PAGE_BY_SLUG[quizSlug];
  if (!page) notFound();

  return <CategoryQuizLanding page={page} />;
}
