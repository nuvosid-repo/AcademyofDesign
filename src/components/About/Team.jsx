import styles from "./Team.module.scss";

// Leadership team. Photos live in /public/assets/team/*.png.
const MEMBERS = [
  { name: "Siddharth Sharma",   role: "Founder & Promoter",                 img: "/assets/team/siddhart.png" },
  { name: "Prachi Mehta",       role: "Co-Founder & Promoter",              img: "/assets/team/prachi.png" },
  { name: "Arun Kumar Sharma",  role: "Chairman Emeritus",                  img: "/assets/team/arun.png" },
  { name: "Shreyash Shah",      role: "Executive Director",                 img: "/assets/team/shreyash.png" },
  { name: "Divyanshu Shrimali", role: "Executive Director",                 img: "/assets/team/divyanshu.png" },
  { name: "Divya Sharma",       role: "Architect & Associated Consultant",  img: "/assets/team/divya.png" },
  { name: "Shantanu Sharma",    role: "Architect & Associated Consultant",  img: "/assets/team/shantanu.png" },
];

export default function Team() {
  return (
    <section className={styles.teamSection}>
      <div className="container">
        <div className={styles.header}>
          <span className={styles.eyebrow}>Our Team</span>
          <h2 className={styles.title}>Meet the <span>Leadership</span></h2>
          <p className={styles.subtitle}>The people behind Surpass Academy, driving its vision forward.</p>
        </div>

        <div className="row g-4 justify-content-center">
          {MEMBERS.map((m) => (
            <div className="col-6 col-md-4 col-lg-3" key={m.name}>
              <div className={styles.card}>
                <div className={styles.photo}>
                  <img src={m.img} alt={m.name} loading="lazy" decoding="async" />
                </div>
                <h3 className={styles.name}>{m.name}</h3>
                <p className={styles.role}>{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
