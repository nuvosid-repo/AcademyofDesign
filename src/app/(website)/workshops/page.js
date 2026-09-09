"use client";
import WorkshopsHeader from "@/components/Workshops/WorkshopsHeader";
import WorkshopsGrid from "@/components/Workshops/WorkshopsGrid";
import styles from "@/components/Workshops/Workshops.module.scss";

export default function WorkshopsPage() {
  return (
    <div className={styles.pageWrapper}>
      <WorkshopsHeader />
      <WorkshopsGrid />
    </div>
  );
}
