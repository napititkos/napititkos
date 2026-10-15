import Icon from '../../components/Icon';
import { TutorialContent } from '../../components/TutorialModal';

export const metadata = {
  title: 'Tutorial - Titkosírás',
  description: 'Három rövid, interaktív gyakorló feladat a kriptikus rejtvények alapjaihoz: szójáték, betűjáték és joker.',
};

export default function TutorialPage() {
  return (
    <div className="wrap">
      <div className="page-title-row">
        <h1 className="page-title">
          <Icon src="/icons/Tutorial.png" size={22} /> Tutorial
        </h1>
        <a href="/" className="back-home-btn"><svg className="back-arrow" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7.5 3.5 3 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> Főoldal</a>
      </div>
      <TutorialContent />
    </div>
  );
}
