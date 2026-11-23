import { AdmissionsCta } from "@/components/AdmissionsCta";
import { Hero } from "@/components/Hero";
import { LifeAtAgape } from "@/components/LifeAtAgape";
import { SectionsIntro } from "@/components/SectionsIntro";

export default function Home() {
  return (
    <>
      <Hero />
      <LifeAtAgape />
      <SectionsIntro />
      <AdmissionsCta />
    </>
  );
}
