import { lifeAtAgape } from "@/content/slides";
import { MediaSlider } from "./MediaSlider";
import { Reveal } from "./Reveal";

export function LifeAtAgape() {
  return (
    <section aria-labelledby="life-heading" className="bg-surface-muted py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 id="life-heading" className="text-3xl font-bold sm:text-4xl">
            {lifeAtAgape.heading}
          </h2>
          <p className="mt-4 text-lg text-ink-muted">{lifeAtAgape.lead}</p>
        </Reveal>
        <Reveal className="mt-10" delay={0.1}>
          <MediaSlider slides={lifeAtAgape.slides} label={lifeAtAgape.heading} />
        </Reveal>
      </div>
    </section>
  );
}
