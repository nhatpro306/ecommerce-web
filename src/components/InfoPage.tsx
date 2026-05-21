import Link from "next/link";

type InfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
};

export function InfoPage({ eyebrow, title, description, sections }: InfoPageProps) {
  return (
    <main className="bg-white text-zinc-950">
      <section className="mx-auto max-w-5xl px-4 py-14 md:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-zinc-600">{description}</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.heading} className="border border-zinc-200 p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                {section.heading}
              </h2>
              <p className="mt-4 leading-7 text-zinc-600">{section.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm text-zinc-600">
            Cần hỗ trợ thêm? Liên hệ RESEY qua trang{" "}
            <Link href="/contact" className="font-bold underline underline-offset-4">
              Liên hệ
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
