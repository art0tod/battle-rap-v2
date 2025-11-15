import HeroSection from "./components/sections/HeroSection/HeroSection";
import AboutSection from "./components/sections/AboutSection/AboutSection";
import NewParticipantsSection from "./components/sections/NewParticipantsSection/NewParticipantsSection";
import BattleRatingSection from "./components/sections/BattleRatingSection/BattleRatingSection";
import PostsSection from "./components/sections/PostsSection/PostsSection";
import ApplySection from "./components/sections/ApplySection/ApplySection";
import styles from "./LandingPage.module.css";

export interface LandingPageProps {
  onParticipate?: () => void;
  rulesHref?: string;
}

export default function LandingPage({ onParticipate, rulesHref }: LandingPageProps) {
  return (
    <main className={styles.page}>
      <HeroSection onParticipate={onParticipate} />
      <AboutSection />
      <NewParticipantsSection />
      <BattleRatingSection />
      <PostsSection />
      <ApplySection onParticipate={onParticipate} rulesHref={rulesHref} />
    </main>
  );
}
