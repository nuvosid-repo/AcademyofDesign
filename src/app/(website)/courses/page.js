"use client";
import CoursesHero from "@/components/Courses/CoursesHero";
import CoursesCatalog from "@/components/Courses/CoursesCatalog";
import Testimonials from "@/components/Testimonials/Testimonials";
import CoursesCTA from "@/components/Courses/CoursesCTA";

export default function CoursesPage() {
  return (
    <main>
      <CoursesHero />
      <CoursesCatalog />
      <Testimonials
        title="Students Who Made It"
        subtitle="From our classrooms to the world's best design studios — see what our graduates have to say."
        accentColor="#db254f"
      />
      <CoursesCTA />
    </main>
  );
}
