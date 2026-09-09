import Hero from "@/components/Home/Hero";
import ClientLogos from "@/components/Home/ClientLogos";
import Banner from "@/components/Home/Banner";
import Courses from "@/components/Home/Courses";
import WhyNuvosid from "@/components/Home/WhyNuvosid";
import Instructors from "@/components/Home/Instructors";
import Workshops from "@/components/Home/Workshops";
import Testimonials from "@/components/Testimonials/Testimonials";
import CTA from "@/components/Home/CTA";
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <ClientLogos />
      <Banner />
      <Instructors />
      <Courses />
      <WhyNuvosid />
      <Testimonials />
      <CTA />
      <Workshops />
    </div>
  );
}
